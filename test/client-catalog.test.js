import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

function loadBundle() {
  const code = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
  let registration
  vm.runInNewContext(code, { console, window: { __ModuleLoader__: { load(value) { registration = value } } } }, { filename: 'client.js' })
  return registration.factory((name) => {
    if (name === 'react') return { createElement() {}, useState() { return [false, () => {}] }, useEffect() {}, useRef() { return { current: null } } }
    throw new Error(`unexpected require: ${name}`)
  })
}

function makeScope() {
  return {
    getSnapshot: () => ({ status: 'ready', value: {}, base: {}, user: {}, writable: true }),
    subscribe: () => () => {},
    mutate: async () => {},
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * The catalog failure was a startup race: the Controller constructs and starts
 * a model refresh before the runtime Remote is mounted, so that first attempt
 * takes the discoverModels fallback. The `_loading` guard then dropped the
 * refresh that setRuntimeApi issued, and the fallback's error stuck until the
 * user pressed "refresh models" by hand.
 */
test('a refresh requested mid-flight is queued, not dropped', async () => {
  const { Controller } = loadBundle().__internals
  let releaseFirst
  const llm = { discoverModels: () => new Promise((resolve) => { releaseFirst = resolve }) }
  const controller = new Controller(makeScope(), {}, llm)

  // Construction already started a refresh, parked on discoverModels.
  assert.equal(controller._loading, true)

  // The runtime Remote lands while that attempt is still in flight.
  controller.setRuntimeApi({ models: async () => ({ ok: true, value: { models: [{ id: 'm1', name: 'M1' }] } }) })
  assert.equal(controller._modelsQueued, true, 'the in-flight attempt must be queued, not discarded')

  // The first attempt fails the way an unregistered namespace does.
  releaseFirst({ ok: false, error: { message: 'llm/model-discovery-rejected' } })
  await tick()
  await tick()

  assert.equal(controller.catalogFailed, false, 'the queued retry must clear the failure')
  assert.equal(controller.catalog.length, 1)
  assert.equal(controller.catalog[0].id, 'm1')
  assert.equal(controller.catalog[0].name, 'M1')
  controller.dispose()
})

test('a queued retry runs at most once', async () => {
  const { Controller } = loadBundle().__internals
  let releaseFirst
  let calls = 0
  const llm = { discoverModels: () => new Promise((resolve) => { releaseFirst = resolve }) }
  const controller = new Controller(makeScope(), {}, llm)
  controller.setRuntimeApi({ models: async () => { calls += 1; return { ok: true, value: { models: [{ id: 'm1' }] } } } })
  controller.setRuntimeApi({ models: async () => { calls += 1; return { ok: true, value: { models: [{ id: 'm1' }] } } } })
  releaseFirst({ ok: false, error: { message: 'nope' } })
  await tick()
  await tick()
  await tick()
  assert.equal(calls, 1, 'coalesced refreshes must not stampede the endpoint')
  controller.dispose()
})

test('a failed refresh still surfaces when nothing is queued', async () => {
  const { Controller } = loadBundle().__internals
  const llm = { discoverModels: async () => ({ ok: false, error: { message: 'llm/model-discovery-rejected' } }) }
  const controller = new Controller(makeScope(), {}, llm)
  await tick()
  await tick()
  assert.equal(controller.catalogFailed, true)
  controller.dispose()
})

/**
 * An empty allowlist means "every model", so pre-ticking the whole catalog read
 * as "only these are allowed" — the opposite of the stored state. Nothing is
 * pre-selected now, and ticking one model selects exactly that one.
 */
test('the model allowlist starts empty and selection is deliberate', async () => {
  const { Controller } = loadBundle().__internals
  const controller = new Controller(makeScope(), {}, {})
  await tick()
  controller.catalog = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]

  assert.equal(controller.draft.visibleModels.length, 0, 'nothing is pre-selected')

  controller.toggleModel('m2', true)
  assert.deepEqual([...controller.draft.visibleModels], ['m2'], 'ticking one model selects exactly that one')

  controller.toggleModel('m1', true)
  assert.deepEqual([...controller.draft.visibleModels], ['m1', 'm2'])

  controller.toggleModel('m1', false)
  assert.deepEqual([...controller.draft.visibleModels], ['m2'])

  controller.toggleModel('m2', false)
  assert.equal(controller.draft.visibleModels.length, 0, 'unticking the last one returns to "every model"')

  controller.toggleModel('m1', true)
  controller.toggleModel('m2', true)
  controller.toggleModel('m3', true)
  assert.equal(controller.draft.visibleModels.length, 0, 'ticking every model normalises back to empty')

  controller.dispose()
})

test('the key-pool inputs are labelled', () => {
  const code = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
  assert.ok(code.includes("t('name')"), 'the name field must carry a label')
  assert.ok(code.includes("t('secret')"), 'the api key field must carry a label')
})
