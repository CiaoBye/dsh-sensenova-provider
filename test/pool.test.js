import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyPool } from '../pool.js'

const SLOTS = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
]

function makePool({ now = () => 1000, ...extra } = {}) {
  return new KeyPool({
    slots: () => SLOTS,
    resolveKey: async (slot) => `key-${slot.id}`,
    now,
    ...extra,
  })
}

test('preferred key wins while usable and fallback still works', async () => {
  const pool = makePool()
  assert.equal((await pool.acquire({ preferredId: 'b' })).slot.id, 'b')
  pool.disable('b')
  const selected = await pool.acquire({ preferredId: 'b' })
  assert.notEqual(selected.slot.id, 'b')
})

test('cooldown and disabled keys can be reset', async () => {
  const pool = makePool()
  pool.cooldown('a', 5000)
  pool.disable('b')
  assert.equal(pool.status().find((x) => x.id === 'a').cooling, true)
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, true)
  pool.reset('a'); pool.reset('b')
  assert.equal(pool.status().find((x) => x.id === 'a').cooling, false)
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, false)
})

test('runtime status never exposes raw keys', async () => {
  const pool = makePool()
  await pool.acquire({ preferredId: 'c' })
  const runtime = await pool.runtimeStatus()
  assert.equal(runtime.lastUsedId, 'c')
  assert.equal(runtime.keys.every((entry) => !('key' in entry)), true)
  assert.equal(runtime.keys.every((entry) => entry.configured), true)
})

test('a persisted snapshot restores a live cooldown and a 401 disable', () => {
  const pool = makePool({
    initialState: {
      a: { disabled: false, disabledAt: 0, cooldownUntil: 5000 },
      b: { disabled: true, disabledAt: 900, cooldownUntil: 0 },
    },
  })
  const status = pool.status()
  assert.equal(status.find((x) => x.id === 'a').cooling, true)
  assert.equal(status.find((x) => x.id === 'b').disabled, true)
  assert.equal(status.find((x) => x.id === 'c').cooling, false)
})

test('a restored cooldown makes acquire skip that key', async () => {
  const pool = makePool({ initialState: { a: { disabled: false, disabledAt: 0, cooldownUntil: 5000 } } })
  const selected = await pool.acquire({ preferredId: 'a' })
  assert.notEqual(selected.slot.id, 'a')
})

test('an already-expired cooldown is not restored', () => {
  const pool = makePool({ initialState: { a: { disabled: false, disabledAt: 0, cooldownUntil: 500 } } })
  assert.equal(pool.status().find((x) => x.id === 'a').cooling, false)
})

test('a 401 disable is forgotten once its ttl has passed', () => {
  const pool = makePool({
    disabledTtlMs: 100,
    initialState: { b: { disabled: true, disabledAt: 100, cooldownUntil: 0 } },
  })
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, false)
})

test('a 401 disable inside its ttl is restored', () => {
  const pool = makePool({
    disabledTtlMs: 5000,
    initialState: { b: { disabled: true, disabledAt: 900, cooldownUntil: 0 } },
  })
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, true)
})

test('a non-positive ttl keeps a 401 disable until an explicit reset', () => {
  const pool = makePool({
    disabledTtlMs: 0,
    initialState: { b: { disabled: true, disabledAt: 1, cooldownUntil: 0 } },
  })
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, true)
  pool.reset('b')
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, false)
})

test('the ttl may be a getter so it follows live configuration', () => {
  // now = 1000 with disabledAt = 900, so the disable is 100ms old.
  const expired = makePool({
    disabledTtlMs: () => 50,
    initialState: { b: { disabled: true, disabledAt: 900, cooldownUntil: 0 } },
  })
  assert.equal(expired.status().find((x) => x.id === 'b').disabled, false)

  const held = makePool({
    disabledTtlMs: () => 5000,
    initialState: { b: { disabled: true, disabledAt: 900, cooldownUntil: 0 } },
  })
  assert.equal(held.status().find((x) => x.id === 'b').disabled, true)
})

test('a non-numeric ttl is treated as "until reset"', () => {
  const pool = makePool({
    disabledTtlMs: 'nonsense',
    initialState: { b: { disabled: true, disabledAt: 1, cooldownUntil: 0 } },
  })
  assert.equal(pool.status().find((x) => x.id === 'b').disabled, true)
})

test('state changes are reported back with only the unhealthy slots', () => {
  const seen = []
  const pool = makePool({ onStateChange: (snapshot) => seen.push(snapshot) })
  pool.cooldown('a', 5000)
  assert.deepEqual(seen.at(-1), { a: { disabled: false, disabledAt: 0, cooldownUntil: 6000 } })
  pool.disable('b')
  assert.deepEqual(seen.at(-1), {
    a: { disabled: false, disabledAt: 0, cooldownUntil: 6000 },
    b: { disabled: true, disabledAt: 1000, cooldownUntil: 0 },
  })
  pool.reset('*')
  assert.deepEqual(seen.at(-1), {})
})

test('a no-op reset does not report a change', () => {
  const seen = []
  const pool = makePool({ onStateChange: (snapshot) => seen.push(snapshot) })
  pool.status()
  pool.reset('a')
  pool.reset('*')
  assert.deepEqual(seen, [])
})

test('persistence defaults to memory until the host says otherwise', async () => {
  const pool = makePool()
  assert.equal(pool.persistence, 'memory')
  pool.persistence = 'file'
  assert.equal((await pool.runtimeStatus()).persistence, 'file')
})

test('a throwing state listener cannot break the pool', () => {
  const pool = makePool({ onStateChange: () => { throw new Error('boom') } })
  pool.cooldown('a', 100)
  pool.disable('b')
  assert.equal(pool.snapshotState().a.cooldownUntil, 1100)
})
