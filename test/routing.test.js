import test from 'node:test'
import assert from 'node:assert/strict'
import { modelIsVisible, preferredKeyForModel, slotsForCredentialRef } from '../routing.js'

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

test('a changed credential maps back to every slot bound to it', () => {
  const keys = [
    { id: 'a', apiKeyEnv: 'SENSENOVA_API_KEY' },
    { id: 'b', apiKeyEnv: 'SENSENOVA_API_KEY_2' },
    { id: 'c', apiKeyEnv: 'SENSENOVA_API_KEY' },
  ]
  assert.deepEqual(slotsForCredentialRef(keys, 'SENSENOVA_API_KEY'), ['a', 'c'])
  assert.deepEqual(slotsForCredentialRef(keys, 'SENSENOVA_API_KEY_2'), ['b'])
})

test('an unrelated or empty reference maps to no slot', () => {
  const keys = [{ id: 'a', apiKeyEnv: 'SENSENOVA_API_KEY' }]
  assert.deepEqual(slotsForCredentialRef(keys, 'OTHER_KEY'), [])
  assert.deepEqual(slotsForCredentialRef(keys, ''), [])
  assert.deepEqual(slotsForCredentialRef(undefined, 'SENSENOVA_API_KEY'), [])
  assert.deepEqual(slotsForCredentialRef([null, { id: '', apiKeyEnv: 'SENSENOVA_API_KEY' }], 'SENSENOVA_API_KEY'), [])
})
