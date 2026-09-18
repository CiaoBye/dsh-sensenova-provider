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

/**
 * Built-in fallback efforts for models whose `/models` entry omits them, in
 * ascending thinking strength.
 *
 * These are the levels a model actually *distinguishes*, which is not the same
 * as the endpoint's accepted-value enum. The enum additionally carries
 * compatibility aliases: accepted with `200 OK`, but silently collapsing onto
 * another level. SenseNova documents `medium` and `xhigh` as exactly that, both
 * resolving to `high` — "出于兼容考虑，接口也接受 medium 和 xhigh，但两者均映射为
 * high". Copying the enum wholesale therefore ships levels that look real and
 * are not: a user selecting `xhigh` to think harder gets `high`, with no error
 * to explain why, which is harder to notice than a plainly missing level. Add
 * an id only once the model's own documentation lists it as distinct.
 */
export const KNOWN_EFFORTS = new Map([
  ['sensenova-6.8-flash-lite', ['low', 'high']],
  ['deepseek-v4-flash', ['low', 'high']],
  ['deepseek-v4-pro', ['low', 'high', 'max']],
  ['glm-5.2', ['high', 'max']],
  ['kimi-k3', ['low', 'high', 'max']],
])

/**
 * Models `/models` still advertises but that cannot serve a chat completion at
 * all, so listing them is worse than omitting them: the picker offers a choice
 * whose every turn fails, and the failure looks like our bug rather than a
 * retired route.
 *
 * Verified by requesting each one directly, three rounds with a working model
 * interleaved as a control — all three answered `404` every round while the
 * control answered `200` every round, so these are persistent, not an outage.
 * The two `u1` entries declare `output_modalities: ["image"]` and are image
 * generators, and `6.7-flash-lite` is the superseded version of the working
 * `6.8-flash-lite`; neither difference is visible in the metadata the endpoint
 * returns, so the ids have to be named here. Re-check this list when SenseNova
 * publishes a model revision.
 */
export const UNAVAILABLE_MODELS = new Set([
  'sensenova-6.7-flash-lite',
  'sensenova-u1-fast',
  'sensenova-u1.5-lite',
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
  // Drop routes that cannot dispatch before they reach any picker or the
  // settings catalog; see UNAVAILABLE_MODELS for how the ids were established.
  if (UNAVAILABLE_MODELS.has(raw.id)) return undefined
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
