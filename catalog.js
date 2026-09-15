const KNOWN_EFFORTS = new Map([
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

export function displayName(id) {
  return id.split(/[-_]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function parseCatalogModel(raw) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.length === 0) return undefined
  const declared = Array.isArray(raw.input_modalities) ? raw.input_modalities : []
  const modalities = [...new Set(declared.filter(value => value === 'text' || value === 'image'))]
  const efforts = Array.isArray(raw.reasoning_efforts)
    ? raw.reasoning_efforts.filter(value => typeof value === 'string' && value.length > 0)
    : KNOWN_EFFORTS.get(raw.id)
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : displayName(raw.id),
    inputModalities: modalities.length > 0 ? modalities : ['text'],
    contextWindow: positiveNumber(raw, ['context_length', 'context_window', 'max_context_length', 'contextLength']),
    maxTokens: positiveNumber(raw, ['max_output_length', 'max_tokens', 'max_output_tokens', 'max_completion_tokens']),
    ...(efforts?.length ? { reasoning: { efforts: efforts.map(id => ({ id, name: id })) } } : {}),
  }
}
