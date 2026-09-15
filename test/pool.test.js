import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyPool } from '../pool.js'

test('round-robin skips disabled and cooling keys', async () => {
  let now = 1000
  const slots = [
    { id: 'a', label: 'A', apiKeyEnv: 'A' },
    { id: 'b', label: 'B', apiKeyEnv: 'B' },
    { id: 'c', label: 'C', apiKeyEnv: 'C' },
  ]
  const pool = new KeyPool({ slots: () => slots, resolveKey: async slot => `key-${slot.id}`, now: () => now })
  assert.equal((await pool.acquire()).slot.id, 'a')
  pool.disable('b')
  assert.equal((await pool.acquire()).slot.id, 'c')
  pool.cooldown('a', 5000)
  assert.equal((await pool.acquire()).slot.id, 'c')
  now = 7000
  assert.equal((await pool.acquire()).slot.id, 'a')
})

test('cooldown reports earliest retry delay', async () => {
  let now = 1000
  const slots = [{ id: 'a' }, { id: 'b' }]
  const pool = new KeyPool({ slots: () => slots, resolveKey: async slot => slot.id, now: () => now })
  await pool.acquire()
  pool.cooldown('a', 5000)
  pool.cooldown('b', 2000)
  assert.equal(pool.earliestCooldownMs(), 2000)
  now = 4000
  assert.equal(pool.earliestCooldownMs(), 2000)
})
