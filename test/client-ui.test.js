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
  vm.runInNewContext(code, {
    console,
    window: {
      __ModuleLoader__: {
        load(value) { registration = value },
      },
    },
  }, { filename: 'client.js' })
  assert.equal(registration.id, '@ciaobye/dsh-sensenova-provider')
  return registration.factory((name) => {
    if (name === 'react') {
      return {
        createElement() {},
        useState() {},
        useEffect() {},
        useRef() {},
      }
    }
    throw new Error(`unexpected require: ${name}`)
  })
}

test('browser bundle exports a DSH client plugin', () => {
  const mod = loadBundle()
  assert.equal(typeof mod.apply, 'function')
  assert.ok(mod.inject.includes('settingsScope'))
  assert.ok(mod.inject.includes('remote.credentials'))
})

test('client registers SenseNova in Settings and overrides the generic Models editor', () => {
  const mod = loadBundle()
  const registered = []
  const scope = {
    getSnapshot: () => ({ status: 'ready', value: {}, writable: true }),
    subscribe: () => () => {},
    mutate: async () => {},
  }
  const ctx = {
    effect() {},
    locale: {
      register() { return () => {} },
      bind() { return (key) => key },
    },
    remote: {
      credentials: { describe: async () => ({ ok: true, value: {} }) },
      $on() { return () => {} },
    },
    settingsScope: { bind() { return scope } },
    slots: {
      inject(_name, fn) { fn() },
      register(meta, component) {
        registered.push({ meta, component })
        return () => {}
      },
    },
  }

  mod.apply(ctx)

  const section = registered.find((entry) => entry.meta.name === 'settings.section')
  assert.ok(section)
  assert.equal(section.meta.id, 'sensenova')
  assert.equal(section.meta.order, 13)

  const providerCard = registered.find((entry) => entry.meta.name === 'settings.models.provider-card')
  assert.ok(providerCard)
  assert.equal(providerCard.meta.key, 'llm-sensenova')
})

test('package publishes the web client and DSH compatibility metadata', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.exports['./client'].default, './client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.dsh.compatibility.dshReleases['0.1.6-alpha.1'], 'compatible')
})
