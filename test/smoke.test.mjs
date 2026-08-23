import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

// Cordis-context smoke tests. They exercise the real plugin against mocked
// seams, but need the DeepSeek Harness peer dependencies installed. In a
// checkout that does not have them (e.g. `node --test` on a fresh clone),
// every test skips instead of failing: the pool/usage unit tests already
// cover the dependency-free logic.

/** Point DSH_HOME at a fresh temp dir so tests never touch the real state file. */
function isolateHome(t) {
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-account-pool-'))
  t.after(() => {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
  })
}

async function loadHarness(t) {
  isolateHome(t)
  let Context, DshAccountPool
  try {
    ;({ Context } = await import('@deepseek-ai/cordis'))
    ;({ DshAccountPool } = await import('../index.js'))
  } catch {
    t.skip('harness peer deps not installed — link the DSH node_modules to run smoke tests')
    return null
  }
  return { Context, DshAccountPool }
}

function makeMockLlms() {
  return {
    registered: [],
    adapter: null,
    registerAdapter(routes, adapter) {
      this.registered.push([...routes])
      this.adapter = adapter
      return {
        replace: next => { this.registered.push([...next]) },
      }
    },
  }
}

function makeMockSettings(get) {
  const scope = {
    get,
    watch: () => () => {},
    update: async () => {},
    replace: async () => {},
  }
  return {
    scope,
    register: () => scope,
  }
}

const CONFIG = {
  providers: {
    'opencode-go': {
      enabled: true,
      takeover: true,
      keys: [],
      preemptAtPercent: 100,
      usageBaseUrl: 'https://opencode.ai/zen/go/v1/usage',
      modelsBaseUrl: 'https://opencode.ai/zen/go/v1/models',
      usageRefreshMs: 30000,
      timeoutMs: 15000,
    },
  },
}

test('plugin registers the opencode-go route and serves the pi-ai catalog', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness

  const root = new Context()
  const llms = makeMockLlms()
  root.provide('llm', llms)
  root.provide('settings', makeMockSettings(() => CONFIG))
  root.provide('credentials', { resolve: async () => undefined })

  await root.plugin(DshAccountPool, {})
  assert.ok(llms.adapter, 'pool adapter registered')
  assert.deepEqual(llms.registered[0], ['opencode-go'])

  const models = await llms.adapter.listModels('opencode-go')
  assert.ok(Array.isArray(models) && models.length > 0, 'catalog lists models')
  const ids = models.map(m => m.id)
  assert.ok(ids.includes('deepseek-v4-flash'), 'catalog keeps opencode-go models')

  // Dry pool: no keys configured → the stream yields one terminal quota error
  // instead of making any provider request.
  const chunks = []
  for await (const chunk of llms.adapter.stream({
    provider: 'opencode-go',
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  })) {
    chunks.push(chunk)
  }
  assert.equal(chunks.at(-1).type, 'finish')
  assert.equal(chunks.at(-1).reason.kind, 'error')
  assert.equal(chunks.at(-1).reason.failure.code, 'QUOTA')
  await root.fiber.dispose()
})

test('a key without a resolvable credential fails the stream loud (MISSING_CREDENTIAL)', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness

  const root = new Context()
  const llms = makeMockLlms()
  root.provide('llm', llms)
  root.provide('settings', makeMockSettings(() => ({
    providers: {
      ...CONFIG.providers,
      'opencode-go': {
        ...CONFIG.providers['opencode-go'],
        keys: [{ id: 'acc-a', label: '主号', apiKeyEnv: 'OPENCODE_GO_KEY_A' }],
      },
    },
  })))
  root.provide('credentials', { resolve: async () => undefined })

  await root.plugin(DshAccountPool, {})
  const stream = llms.adapter.stream({
    provider: 'opencode-go',
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  })
  await assert.rejects(async () => {
    for await (const _chunk of stream) { /* drain */ }
  }, err => err.code === 'MISSING_CREDENTIAL')
  await root.fiber.dispose()
})

test('status() reports the pool without network when keys are empty', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness

  const root = new Context()
  const llms = makeMockLlms()
  root.provide('llm', llms)
  root.provide('settings', makeMockSettings(() => CONFIG))
  root.provide('credentials', { resolve: async () => undefined })

  await root.plugin(DshAccountPool, {})
  const plugin = root.get('accountPool')
  const status = await plugin.status()
  const go = status.providers.find(item => item.id === 'opencode-go')
  assert.equal(go.takeover, 'serving')
  assert.equal(go.takeoverEnabled, true)
  assert.equal(go.route, 'opencode-go')
  assert.deepEqual(go.switchHistory, [])
  assert.deepEqual(go.keys, [])
  await root.fiber.dispose()
})

test('takeover: dormant while the route is owned elsewhere, auto-registers on adapters-updated', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness

  const root = new Context()
  const llms = makeMockLlms()
  let blocked = true
  const recorded = []
  llms.registerAdapter = (routes, adapter) => {
    if (blocked) throw new Error('llm: duplicate adapter for provider "opencode-go"')
    recorded.push([...routes])
    return { replace: next => { recorded.push([...next]) } }
  }
  root.provide('llm', llms)
  root.provide('settings', makeMockSettings(() => CONFIG))
  root.provide('credentials', { resolve: async () => undefined })

  await root.plugin(DshAccountPool, {})
  const plugin = root.get('accountPool')

  // While pi-ai (or any plugin) owns the route: dormant, surfaced as waiting.
  assert.equal(plugin.takeoverState('opencode-go'), 'waiting')
  const waiting = await plugin.status()
  const waitingGo = waiting.providers.find(item => item.id === 'opencode-go')
  assert.equal(waitingGo.takeover, 'waiting')
  assert.ok(waitingGo.takeoverHint, 'the refusal reason rides the card hint')

  // The owner releases the route → the registry emits adapters-updated →
  // the plugin takes over automatically.
  blocked = false
  root.emit('llm/adapters-updated')
  assert.equal(plugin.takeoverState('opencode-go'), 'serving')
  assert.deepEqual(recorded, [['opencode-go']])
  const serving = await plugin.status()
  const servingGo = serving.providers.find(item => item.id === 'opencode-go')
  assert.equal(servingGo.takeover, 'serving')
  assert.equal(servingGo.takeoverHint, null)
  await root.fiber.dispose()
})

/** Scripted fake inner adapter: each stream() call consumes one script step. */
class FakeInnerAdapter {
  constructor(script) {
    this.script = script
    this.calls = 0
  }
  async *stream(_options) {
    const step = this.script[Math.min(this.calls++, this.script.length - 1)]
    for (const chunk of step) yield chunk
  }
}

const quotaFinish = {
  type: 'finish',
  reason: { kind: 'error', failure: { code: 'QUOTA', message: 'quota exhausted' } },
}
const successChunks = [
  { type: 'text-delta', index: 0, text: 'hello' },
  { type: 'finish', reason: { kind: 'stop' } },
]
const TWO_KEYS = [
  { id: 'acc-a', label: '主号', apiKeyEnv: 'OPENCODE_GO_KEY_A' },
  { id: 'acc-b', label: '备用2', apiKeyEnv: 'OPENCODE_GO_KEY_B' },
]
const REQUEST = {
  provider: 'opencode-go',
  model: 'deepseek-v4-flash',
  messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
}

async function bootPoolPlugin(Context, DshAccountPool, keys) {
  const root = new Context()
  const llms = makeMockLlms()
  root.provide('llm', llms)
  root.provide('settings', makeMockSettings(() => ({
    providers: {
      ...CONFIG.providers,
      'opencode-go': { ...CONFIG.providers['opencode-go'], keys },
    },
  })))
  root.provide('credentials', { resolve: async () => undefined })
  await root.plugin(DshAccountPool, {})
  const plugin = root.get('accountPool')
  return { root, llms, plugin }
}

test('failover: a pre-content quota failure silently retries with the next key', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness
  const { root, llms, plugin } = await bootPoolPlugin(Context, DshAccountPool, TWO_KEYS)

  // Attempt 1 fails with quota before any content; attempt 2 succeeds.
  const fake = new FakeInnerAdapter([[quotaFinish], successChunks])
  plugin.makeAttemptAdapter = () => fake

  const chunks = []
  for await (const chunk of llms.adapter.stream(REQUEST)) chunks.push(chunk)

  // The consumer sees exactly one successful stream — no error ever surfaced.
  assert.equal(chunks.length, 2)
  assert.deepEqual(chunks[0], { type: 'text-delta', index: 0, text: 'hello' })
  assert.equal(chunks[1].type, 'finish')
  assert.equal(chunks[1].reason.kind, 'stop')
  assert.equal(fake.calls, 2)
  const goPool = plugin.poolFor('opencode-go')
  assert.equal(goPool.stateOf('acc-a').state, 'exhausted')
  assert.equal(goPool.activeId, 'acc-b')
  assert.equal(goPool.lastSwitch.reason, 'quota')
  await root.fiber.dispose()
})

test('failover: a mid-stream quota failure surfaces the error but still rotates', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness
  const { root, llms, plugin } = await bootPoolPlugin(Context, DshAccountPool, TWO_KEYS)

  // Content was already emitted → cannot silently retry; rotate and surface.
  const fake = new FakeInnerAdapter([[
    { type: 'text-delta', index: 0, text: 'partial' },
    quotaFinish,
  ]])
  plugin.makeAttemptAdapter = () => fake

  const chunks = []
  for await (const chunk of llms.adapter.stream(REQUEST)) chunks.push(chunk)

  assert.equal(chunks.length, 2)
  assert.equal(chunks[0].type, 'text-delta')
  assert.equal(chunks[1].type, 'finish')
  assert.equal(chunks[1].reason.kind, 'error')
  assert.equal(chunks[1].reason.failure.code, 'QUOTA')
  assert.equal(fake.calls, 1, 'no silent retry after content was emitted')
  const goPool = plugin.poolFor('opencode-go')
  assert.equal(goPool.stateOf('acc-a').state, 'exhausted')
  assert.equal(goPool.activeId, 'acc-b')
  await root.fiber.dispose()
})

test('failover: exhausting every key surfaces one terminal dry-pool error', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness
  const { root, llms, plugin } = await bootPoolPlugin(Context, DshAccountPool, TWO_KEYS)

  // Every attempt fails with quota before content: both keys silently rotate,
  // then the pool is dry and yields the terminal error exactly once.
  const fake = new FakeInnerAdapter([[quotaFinish]])
  plugin.makeAttemptAdapter = () => fake

  const chunks = []
  for await (const chunk of llms.adapter.stream(REQUEST)) chunks.push(chunk)

  assert.equal(chunks.length, 1)
  assert.equal(chunks[0].type, 'finish')
  assert.equal(chunks[0].reason.kind, 'error')
  assert.equal(chunks[0].reason.failure.code, 'QUOTA')
  assert.equal(fake.calls, 2, 'one attempt per key')
  assert.equal(plugin.poolFor('opencode-go').usableCount(), 0)
  await root.fiber.dispose()
})

test('failover: non-rotation failures keep the key and surface immediately', async (t) => {
  const harness = await loadHarness(t)
  if (!harness) return
  const { Context, DshAccountPool } = harness
  const { root, llms, plugin } = await bootPoolPlugin(Context, DshAccountPool, TWO_KEYS)

  const fake = new FakeInnerAdapter([[
    { type: 'finish', reason: { kind: 'error', failure: { code: 'RATE_LIMIT', message: 'slow down' } } },
  ]])
  plugin.makeAttemptAdapter = () => fake

  const chunks = []
  for await (const chunk of llms.adapter.stream(REQUEST)) chunks.push(chunk)

  assert.equal(chunks.length, 1)
  assert.equal(chunks[0].reason.failure.code, 'RATE_LIMIT')
  assert.equal(fake.calls, 1, 'no rotation retry for rate limits')
  assert.equal(plugin.poolFor('opencode-go').stateOf('acc-a').state, 'healthy')
  assert.equal(plugin.poolFor('opencode-go').activeId, 'acc-a')
  await root.fiber.dispose()
})
