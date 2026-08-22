import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeLiveModels, parseModelList } from '../catalog.js'

const STATIC = [
  {
    id: 'known', name: 'Known', api: 'openai-completions', provider: 'opencode-go',
    baseUrl: 'https://opencode.ai/zen/go/v1', reasoning: true, input: ['text'],
    cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000, maxTokens: 500,
  },
]

test('model list parser accepts OpenAI-style data and plain arrays', () => {
  assert.deepEqual(parseModelList({ data: [{ id: 'a' }] }), [{ id: 'a' }])
  assert.deepEqual(parseModelList([{ id: 'b' }]), [{ id: 'b' }])
  assert.deepEqual(parseModelList({ nope: true }), [])
})

test('OpenCode live ids keep static metadata and accept known overrides', () => {
  const models = mergeLiveModels('opencode-go', STATIC, {
    data: [{ id: 'known' }, { id: 'ox-alpha-free' }, { id: 'unknown-new-model' }],
  })
  assert.equal(models.length, 2)
  assert.equal(models.find(model => model.id === 'known').contextWindow, 1000)
  const ox = models.find(model => model.id === 'ox-alpha-free')
  assert.equal(ox.api, 'openai-completions')
  assert.equal(ox.maxTokens, 131072)
  assert.equal(models.some(model => model.id === 'unknown-new-model'), false)
})

test('OpenRouter live models are converted to pi-ai model metadata', () => {
  const models = mergeLiveModels('openrouter', [], {
    data: [{
      id: 'vendor/model',
      name: 'Vendor Model',
      architecture: { input_modalities: ['text', 'image'] },
      context_length: 200000,
      supported_parameters: ['tools', 'reasoning'],
      pricing: { prompt: '0.000001', completion: '0.000003' },
      top_provider: { max_completion_tokens: 64000 },
    }],
  })
  assert.deepEqual(models[0], {
    id: 'vendor/model',
    name: 'Vendor Model',
    api: 'openai-completions',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    reasoning: true,
    input: ['text', 'image'],
    cost: { input: 1, output: 3, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 64000,
    compat: { supportsDeveloperRole: false, thinkingFormat: 'openrouter' },
  })
})
