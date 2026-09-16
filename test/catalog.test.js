import test from 'node:test'
import assert from 'node:assert/strict'
import { builtinEfforts, parseCatalogModel, resolveReasoningEfforts, toDiscoveredModel } from '../catalog.js'

test('the live server payload wins over the built-in guess', () => {
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'deepseek-v4-pro', reasoning_efforts: ['minimal'] }),
    [{ id: 'minimal', name: 'minimal' }],
  )
})

test('accepts object-shaped server efforts and keeps name and description', () => {
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'm', reasoning_efforts: [{ id: 'high', name: 'High', description: 'slowest' }] }),
    [{ id: 'high', name: 'High', description: 'slowest' }],
  )
})

test('an object-shaped effort without a name falls back to its id', () => {
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'm', reasoning_efforts: [{ id: 'low' }] }),
    [{ id: 'low', name: 'low' }],
  )
})

test('an operator override beats the built-in table', () => {
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'kimi-k3' }, { 'kimi-k3': ['only'] }),
    [{ id: 'only', name: 'only' }],
  )
})

test('the server payload beats an operator override', () => {
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'kimi-k3', reasoning_efforts: ['fromserver'] }, { 'kimi-k3': ['override'] }),
    [{ id: 'fromserver', name: 'fromserver' }],
  )
})

test('falls back to the built-in table when the server omits efforts', () => {
  assert.deepEqual(resolveReasoningEfforts({ id: 'kimi-k3' }), builtinEfforts('kimi-k3'))
})

test('an empty server list still falls back to the built-in table', () => {
  assert.deepEqual(resolveReasoningEfforts({ id: 'kimi-k3', reasoning_efforts: [] }), builtinEfforts('kimi-k3'))
})

test('an unknown model exposes no efforts rather than guessing', () => {
  assert.equal(resolveReasoningEfforts({ id: 'no-such-model' }), undefined)
  assert.equal(resolveReasoningEfforts({ id: 'no-such-model' }, { other: ['low'] }), undefined)
})

test('effort ids are trimmed and deduplicated', () => {
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'm', reasoning_efforts: [' low ', 'low', '', 'high'] }),
    [{ id: 'low', name: 'low' }, { id: 'high', name: 'high' }],
  )
  assert.deepEqual(
    resolveReasoningEfforts({ id: 'm' }, { m: [' x ', 'x', 'y'] }),
    [{ id: 'x', name: 'x' }, { id: 'y', name: 'y' }],
  )
})

test('an override entry cannot blank out the built-in table', () => {
  assert.deepEqual(resolveReasoningEfforts({ id: 'kimi-k3' }, { 'kimi-k3': [] }), builtinEfforts('kimi-k3'))
})

test('parseCatalogModel wires overrides through to reasoning metadata', () => {
  assert.deepEqual(
    parseCatalogModel({ id: 'x' }, { effortOverrides: { x: ['a'] } }).reasoning,
    { efforts: [{ id: 'a', name: 'a' }] },
  )
})

test('parseCatalogModel omits reasoning when nothing is known', () => {
  const entry = parseCatalogModel({ id: 'x' })
  assert.equal('reasoning' in entry, false)
})

test('parseCatalogModel still reads context and output caps', () => {
  const entry = parseCatalogModel({ id: 'x', context_length: 8192, max_output_length: 1024 })
  assert.equal(entry.contextWindow, 8192)
  assert.equal(entry.maxTokens, 1024)
})

test('toDiscoveredModel omits undisclosed fields rather than sending undefined', () => {
  assert.deepEqual(toDiscoveredModel({ id: 'm', name: 'M' }), { id: 'm', name: 'M' })
  assert.deepEqual(
    toDiscoveredModel({ id: 'm', name: 'M', contextWindow: 8192, maxTokens: 1024 }),
    { id: 'm', name: 'M', contextWindow: 8192, maxTokens: 1024 },
  )
})
