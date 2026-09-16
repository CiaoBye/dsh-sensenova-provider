import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RuntimeStateStore, defaultStateFilePath } from '../state-store.js'

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'sn-state-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('round-trips a snapshot and creates missing directories', (t) => {
  const file = join(tempDir(t), 'nested', 'key-state.json')
  const store = new RuntimeStateStore({ filePath: file, debounceMs: 0 })
  store.save({ a: { disabled: true, disabledAt: 1000, cooldownUntil: 0 } })
  store.flush()
  assert.deepEqual(new RuntimeStateStore({ filePath: file }).load(), {
    a: { disabled: true, disabledAt: 1000, cooldownUntil: 0 },
  })
})

test('a missing file reads as empty state', (t) => {
  const store = new RuntimeStateStore({ filePath: join(tempDir(t), 'absent.json') })
  assert.deepEqual(store.load(), {})
})

test('a damaged file reads as empty state instead of throwing', (t) => {
  const file = join(tempDir(t), 'key-state.json')
  writeFileSync(file, '{ this is not json')
  assert.deepEqual(new RuntimeStateStore({ filePath: file }).load(), {})
})

test('a foreign format version is ignored', (t) => {
  const file = join(tempDir(t), 'key-state.json')
  writeFileSync(file, JSON.stringify({ version: 99, keys: { a: { disabled: true } } }))
  assert.deepEqual(new RuntimeStateStore({ filePath: file }).load(), {})
})

test('drops records that carry no live runtime fact', (t) => {
  const file = join(tempDir(t), 'key-state.json')
  writeFileSync(file, JSON.stringify({
    version: 1,
    keys: {
      healthy: { disabled: false, cooldownUntil: 0 },
      junk: 'not-a-record',
      cooling: { disabled: false, cooldownUntil: 1234 },
      banned: { disabled: true },
    },
  }))
  assert.deepEqual(new RuntimeStateStore({ filePath: file }).load(), {
    cooling: { disabled: false, disabledAt: 0, cooldownUntil: 1234 },
    banned: { disabled: true, disabledAt: 0, cooldownUntil: 0 },
  })
})

test('a store without a path never touches the disk', () => {
  const store = new RuntimeStateStore({ filePath: '' })
  assert.equal(store.enabled, false)
  assert.deepEqual(store.load(), {})
  store.save({ a: { disabled: true, disabledAt: 1, cooldownUntil: 0 } })
  store.flush()
  store.close()
  assert.equal(store.enabled, false)
})

test('debounces writes and persists only the latest snapshot', async (t) => {
  const file = join(tempDir(t), 'key-state.json')
  const store = new RuntimeStateStore({ filePath: file, debounceMs: 20 })
  t.after(() => store.close())
  store.save({ a: { disabled: false, disabledAt: 0, cooldownUntil: 111 } })
  store.save({ b: { disabled: true, disabledAt: 5, cooldownUntil: 0 } })
  await new Promise(resolve => setTimeout(resolve, 80))
  assert.deepEqual(new RuntimeStateStore({ filePath: file }).load(), {
    b: { disabled: true, disabledAt: 5, cooldownUntil: 0 },
  })
})

test('the write is atomic: no temp file survives a successful save', (t) => {
  const dir = tempDir(t)
  const file = join(dir, 'key-state.json')
  const store = new RuntimeStateStore({ filePath: file, debounceMs: 0 })
  store.save({ a: { disabled: true, disabledAt: 1, cooldownUntil: 0 } })
  store.flush()
  const text = readFileSync(file, 'utf8')
  assert.equal(JSON.parse(text).version, 1)
  assert.throws(() => readFileSync(`${file}.tmp`, 'utf8'))
})

test('an unwritable target degrades to a warning, not a crash', (t) => {
  const dir = tempDir(t)
  const blocked = join(dir, 'blocked')
  mkdirSync(blocked)
  // A directory where the file must go makes the rename fail.
  const warnings = []
  const store = new RuntimeStateStore({ filePath: blocked, logger: { warn: m => warnings.push(m) }, debounceMs: 0 })
  store.save({ a: { disabled: true, disabledAt: 1, cooldownUntil: 0 } })
  store.flush()
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /could not persist runtime state/)
})

test('defaults the state path under DSH_HOME', () => {
  assert.equal(
    defaultStateFilePath({ DSH_HOME: join('tmp', 'dsh-home') }),
    join('tmp', 'dsh-home', 'storages', 'llm-sensenova', 'key-state.json'),
  )
})
