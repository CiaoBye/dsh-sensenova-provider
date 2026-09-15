import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyPool } from '../pool.js'

function makePool(now = () => 1000) {
  const slots = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ]
  return new KeyPool({ slots: () => slots, resolveKey: async (slot) => `key-${slot.id}`, now })
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
