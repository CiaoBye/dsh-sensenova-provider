/**
 * Live model catalog helpers.
 *
 * Static pi-ai catalogs provide protocol/capability metadata. Provider live
 * endpoints provide freshness. This module merges them conservatively:
 * known ids retain static metadata, while new ids are accepted only when a
 * safe protocol/metadata mapping is available.
 */

import { modelIdOf } from './driver-core.js'

const OPEN_CODE_OVERRIDES = Object.freeze({
  'opencode-go:ox-alpha-free': {
    name: 'Ox Alpha Free',
    api: 'openai-completions',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 1048576,
    maxTokens: 131072,
    thinkingLevelMap: { off: null, minimal: null, low: 'low', medium: null, high: 'high', xhigh: null, max: 'max' },
    compat: { supportsStore: false, supportsDeveloperRole: false, maxTokensField: 'max_tokens' },
  },
  'opencode:x-preview-f-free': {
    name: 'Ox Alpha',
    api: 'openai-completions',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 1048576,
    maxTokens: 131072,
    thinkingLevelMap: { off: null, minimal: null, low: 'low', medium: null, high: 'high', xhigh: null, max: 'max' },
    compat: { supportsStore: false, supportsDeveloperRole: false, maxTokensField: 'max_tokens' },
  },
})

function finite(value, fallback = null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function stringValue(value, fallback = '') {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

const MODEL_GROUP_LABELS = Object.freeze({
  ai21: 'AI21',
  'aion-labs': 'AionLabs',
  amazon: 'Amazon',
  anthropic: 'Anthropic',
  'arcee-ai': 'Arcee AI',
  auto: '自动路由',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  google: 'Google',
  inclusionai: 'InclusionAI',
  'meta-llama': 'Meta Llama',
  minimax: 'MiniMax',
  mistralai: 'Mistral AI',
  moonshotai: 'MoonshotAI',
  nvidia: 'NVIDIA',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  poolside: 'Poolside',
  qwen: 'Qwen',
  'bytedance-seed': 'ByteDance Seed',
  'x-ai': 'xAI',
  'z-ai': 'Z.AI',
})

function modelGroupOf(id) {
  const value = stringValue(id, 'other')
  const slash = value.indexOf('/')
  const group = slash > 0 ? value.slice(0, slash) : value
  return group.replace(/^~/, '') || 'other'
}

function modelGroupLabel(group) {
  if (MODEL_GROUP_LABELS[group]) return MODEL_GROUP_LABELS[group]
  return group
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Other'
}

function modelTags(model) {
  const id = stringValue(model?.id)
  const name = stringValue(model?.name)
  const text = `${id} ${name}`.toLowerCase()
  const tags = []
  const input = new Set(Array.isArray(model?.input) ? model.input : [])
  if (input.has('image')) tags.push('vision')
  if (input.has('audio')) tags.push('audio')
  if (input.has('video')) tags.push('video')
  if (model?.reasoning || /reasoning|thinking/.test(text)) tags.push('reasoning')
  if (/code|coder|coding|program|dev/.test(text)) tags.push('coding')
  if (/free/.test(text)
      || (model?.cost && model.cost.input === 0 && model.cost.output === 0)) tags.push('free')
  if (/latest/.test(text)) tags.push('latest')
  if (/preview/.test(text)) tags.push('preview')
  if (/fast|flash/.test(text)) tags.push('fast')
  if (/instruct/.test(text)) tags.push('instruct')
  if (/^~|\bauto\b/.test(id)) tags.push('alias')
  return [...new Set(tags)]
}

/** Convert catalog metadata into the stable, UI-safe model summary. */
export function summarizeModel(model, enabled = false) {
  const id = modelIdOf(model)
  if (!id) return null
  const group = modelGroupOf(id)
  return {
    id,
    name: stringValue(model.name, id),
    enabled: Boolean(enabled),
    providerGroup: group,
    providerLabel: modelGroupLabel(group),
    input: Array.isArray(model.input) ? [...model.input] : ['text'],
    reasoning: Boolean(model.reasoning),
    contextWindow: finite(model.contextWindow),
    maxTokens: finite(model.maxTokens),
    cost: model.cost && typeof model.cost === 'object'
      ? {
        input: finite(model.cost.input, 0),
        output: finite(model.cost.output, 0),
      }
      : null,
    tags: modelTags(model),
  }
}

function toMillionsPerToken(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number * 1000000 : 0
}

function openRouterModel(raw) {
  const id = modelIdOf(raw)
  if (!id || !raw || typeof raw !== 'object') return null
  const architecture = raw.architecture && typeof raw.architecture === 'object' ? raw.architecture : {}
  const pricing = raw.pricing && typeof raw.pricing === 'object' ? raw.pricing : {}
  const topProvider = raw.top_provider && typeof raw.top_provider === 'object' ? raw.top_provider : {}
  const parameters = Array.isArray(raw.supported_parameters) ? raw.supported_parameters : []
  const input = Array.isArray(architecture.input_modalities) && architecture.input_modalities.length > 0
    ? architecture.input_modalities.filter(item => typeof item === 'string')
    : ['text']
  return {
    id,
    name: stringValue(raw.name, id),
    api: 'openai-completions',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    reasoning: parameters.includes('reasoning') || parameters.includes('include_reasoning'),
    input,
    cost: {
      input: toMillionsPerToken(pricing.prompt),
      output: toMillionsPerToken(pricing.completion),
      cacheRead: 0,
      cacheWrite: 0,
    },
    contextWindow: finite(raw.context_length, 128000),
    maxTokens: finite(topProvider.max_completion_tokens, 8192),
    compat: {
      supportsDeveloperRole: false,
      thinkingFormat: 'openrouter',
    },
  }
}

function openCodeModel(providerId, raw, staticById) {
  const id = modelIdOf(raw)
  if (!id) return null
  const known = staticById.get(id)
  if (known) return known
  const override = OPEN_CODE_OVERRIDES[`${providerId}:${id}`]
  if (!override) return null
  return {
    id,
    provider: providerId,
    baseUrl: providerId === 'opencode-go' ? 'https://opencode.ai/zen/go/v1' : 'https://opencode.ai/zen/v1',
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    ...override,
  }
}

export function parseModelList(body) {
  if (Array.isArray(body)) return body
  if (!body || typeof body !== 'object') return []
  if (Array.isArray(body.data)) return body.data
  if (Array.isArray(body.models)) return body.models
  return []
}

/** Merge a live response into the static pi-ai catalog. */
export function mergeLiveModels(providerId, staticModels, body) {
  const baseline = Array.isArray(staticModels) ? staticModels : []
  const byId = new Map(baseline.map(model => [model.id, model]))
  const live = parseModelList(body)
  for (const raw of live) {
    const model = providerId === 'openrouter'
      ? openRouterModel(raw)
      : openCodeModel(providerId, raw, byId)
    if (model) byId.set(model.id, model)
  }
  return [...byId.values()]
}

export function modelOverride(providerId, id) {
  return OPEN_CODE_OVERRIDES[`${providerId}:${id}`] ?? null
}

export { modelGroupOf, modelGroupLabel, modelTags }
