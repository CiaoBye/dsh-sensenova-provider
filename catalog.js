/**
 * SenseNova catalog parsing.
 *
 * Reasoning-effort metadata is the one field here that can cause a hard
 * failure rather than a degradation: `dsh-llm` rejects an unsupported explicit
 * effort before any provider I/O, with no clamping or aliasing. Advertising an
 * effort a model does not accept therefore breaks the user's selection instead
 * of falling back, so the resolution order below is deliberate — the live
 * `/models` payload wins, then an operator override, and only then the built-in
 * guess table.
 */

/** Built-in fallback efforts for models whose `/models` entry omits them. */
export const KNOWN_EFFORTS = new Map([
  ['sensenova-6.8-flash-lite', ['low', 'medium', 'high', 'none']],
  ['deepseek-v4-flash', ['low', 'medium', 'high', 'none']],
  ['deepseek-v4-pro', ['low', 'high', 'max']],
  ['glm-5.2', ['low', 'medium', 'high', 'none']],
  ['kimi-k3', ['low', 'high', 'max']],
])

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveNumber(raw, keys) {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  }
  return undefined
}

function cleanEffortIds(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * Read a server effort list. Accepts both shapes the endpoint has been seen to
 * use: bare id strings and `{ id, name, description }` objects. Returns
 * `undefined` when the field is absent or unusable, so callers can fall back.
 */
function serverEfforts(value) {
  if (!Array.isArray(value)) return undefined
  const out = []
  const seen = new Set()
  for (const item of value) {
    if (typeof item === 'string') {
      const id = item.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push({ id, name: id })
      continue
    }
    if (!isRecord(item)) continue
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : id
    const description = typeof item.description === 'string' && item.description.trim() ? item.description.trim() : undefined
    out.push(description ? { id, name, description } : { id, name })
  }
  return out.length > 0 ? out : undefined
}

/** Read one model's operator override (a `reasoningEfforts` config entry). */
export function overrideEfforts(overrides, model) {
  if (!isRecord(overrides)) return undefined
  const ids = cleanEffortIds(overrides[model])
  return ids.length > 0 ? ids.map(id => ({ id, name: id })) : undefined
}

/** Read the built-in guess table for one model. */
export function builtinEfforts(model) {
  const known = KNOWN_EFFORTS.get(model)
  return Array.isArray(known) && known.length > 0 ? known.map(id => ({ id, name: id })) : undefined
}

/**
 * Resolve the selectable efforts for one catalog entry.
 * Order: live server payload, then operator override, then built-in guess.
 * @param raw - One `/models` entry.
 * @param overrides - Model id to effort-id list.
 * @returns Effort descriptors, or `undefined` when nothing is known.
 */
export function resolveReasoningEfforts(raw, overrides) {
  if (!isRecord(raw)) return undefined
  return serverEfforts(raw.reasoning_efforts)
    ?? overrideEfforts(overrides, raw.id)
    ?? builtinEfforts(raw.id)
}

export function displayName(id) {
  return id.split(/[-_]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function parseCatalogModel(raw, { effortOverrides } = {}) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.length === 0) return undefined
  const declared = Array.isArray(raw.input_modalities) ? raw.input_modalities : []
  const modalities = [...new Set(declared.filter(value => value === 'text' || value === 'image'))]
  const efforts = resolveReasoningEfforts(raw, effortOverrides)
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : displayName(raw.id),
    inputModalities: modalities.length > 0 ? modalities : ['text'],
    contextWindow: positiveNumber(raw, ['context_length', 'context_window', 'max_context_length', 'contextLength']),
    maxTokens: positiveNumber(raw, ['max_output_length', 'max_tokens', 'max_output_tokens', 'max_completion_tokens']),
    ...(efforts?.length ? { reasoning: { efforts } } : {}),
  }
}

/**
 * Project one parsed catalog entry onto the shape `dsh-llm` model discovery
 * accepts (`LlmDiscoveredModel`). Optional fields are omitted rather than sent
 * as `undefined`, so the harness sees "not disclosed" instead of a null.
 * @param entry - A parsed catalog entry.
 * @returns The discovered-model projection.
 */
export function toDiscoveredModel(entry) {
  return {
    id: entry.id,
    name: entry.name,
    ...(entry.contextWindow ? { contextWindow: entry.contextWindow } : {}),
    ...(entry.maxTokens ? { maxTokens: entry.maxTokens } : {}),
  }
}
