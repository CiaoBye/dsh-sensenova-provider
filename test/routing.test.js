import test from 'node:test'
import assert from 'node:assert/strict'
import { modelIsVisible, preferredKeyForModel } from '../routing.js'

const config = {
  keys: [{ id: 'a' }, { id: 'b' }],
  activeKey: 'a',
  modelKeyRules: [
    { models: ['m2'], keyId: 'b' },
    { models: ['m2'], keyId: 'a' },
  ],
  visibleModels: ['m1'],
}

test('first matching model route wins before active key', () => {
  assert.equal(preferredKeyForModel(config, 'm2'), 'b')
  assert.equal(preferredKeyForModel(config, 'm3'), 'a')
})

test('visibleModels empty means all; non-empty is an allowlist', () => {
  assert.equal(modelIsVisible(config, 'm1'), true)
  assert.equal(modelIsVisible(config, 'm2'), false)
  assert.equal(modelIsVisible({ ...config, visibleModels: [] }, 'm2'), true)
})
