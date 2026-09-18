import test from 'node:test'
import assert from 'node:assert/strict'
import { KNOWN_EFFORTS, UNAVAILABLE_MODELS, builtinEfforts, parseCatalogModel, resolveReasoningEfforts, toDiscoveredModel } from '../catalog.js'

/** Ascending thinking strength, as SenseNova names its own levels. */
const STRENGTH_ORDER = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

/**
 * Levels SenseNova accepts with `200 OK` but documents as compatibility aliases
 * that collapse onto `high`. They must never reach the picker: selecting one
 * silently produces `high`, so the user sees a stronger label and identical work.
 */
const COMPATIBILITY_ALIASES = ['minimal', 'medium', 'xhigh']

/**
 * Pinned per model against the vendor documentation, which lists the levels each
 * model actually distinguishes. A too-long table ships alias levels that lie
 * about their strength; a too-short one hides a real level — neither fails
 * loudly, so the ids are asserted exactly.
 */
test('the built-in table lists exactly the distinct efforts each model documents', () => {
  const expected = new Map([
    ['sensenova-6.8-flash-lite', ['low', 'high']],
    ['deepseek-v4-flash', ['low', 'high']],
    ['deepseek-v4-pro', ['low', 'high', 'max']],
    ['glm-5.2', ['high', 'max']],
    ['kimi-k3', ['low', 'high', 'max']],
  ])
  assert.deepEqual([...KNOWN_EFFORTS.keys()], [...expected.keys()])
  for (const [model, efforts] of expected) {
    assert.deepEqual(builtinEfforts(model).map(effort => effort.id), efforts, model)
  }
})

test('no model advertises a compatibility alias as a real thinking level', () => {
  for (const model of KNOWN_EFFORTS.keys()) {
    const ids = builtinEfforts(model).map(effort => effort.id)
    for (const alias of COMPATIBILITY_ALIASES) {
      assert.ok(!ids.includes(alias), `${model} advertises the alias "${alias}" as a real level`)
    }
  }
})

test('built-in efforts stay on the SenseNova scale and ascend in strength', () => {
  for (const model of KNOWN_EFFORTS.keys()) {
    const ranked = builtinEfforts(model).map(effort => STRENGTH_ORDER.indexOf(effort.id))
    assert.ok(ranked.every(index => index >= 0), `${model} lists an id outside the SenseNova scale`)
    assert.deepEqual(ranked, [...ranked].sort((a, b) => a - b), `${model} is not in strength order`)
  }
})

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

test('routes that cannot dispatch are dropped from the catalog', () => {
  // These answer 404 to every chat completion while the endpoint keeps listing
  // them, so a picker built from the catalog would offer an unusable choice.
  for (const id of ['sensenova-6.7-flash-lite', 'sensenova-u1-fast', 'sensenova-u1.5-lite']) {
    assert.ok(UNAVAILABLE_MODELS.has(id), `${id} should be excluded`)
    assert.equal(parseCatalogModel({ id }), undefined, `${id} should not parse into the catalog`)
  }
})

test('excluding unavailable routes leaves the working ones untouched', () => {
  // The exclusion is by exact id: a working model that merely shares a prefix
  // with an excluded one must still survive.
  for (const id of ['sensenova-6.8-flash-lite', 'deepseek-v4-flash', 'glm-5.2', 'deepseek-v4-pro', 'kimi-k3']) {
    assert.equal(parseCatalogModel({ id })?.id, id, `${id} should still parse`)
  }
})

test('toDiscoveredModel omits undisclosed fields rather than sending undefined', () => {
  assert.deepEqual(toDiscoveredModel({ id: 'm', name: 'M' }), { id: 'm', name: 'M' })
  assert.deepEqual(
    toDiscoveredModel({ id: 'm', name: 'M', contextWindow: 8192, maxTokens: 1024 }),
    { id: 'm', name: 'M', contextWindow: 8192, maxTokens: 1024 },
  )
})
