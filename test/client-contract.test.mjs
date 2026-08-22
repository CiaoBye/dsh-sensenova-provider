import assert from 'node:assert/strict'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const clientUrl = pathToFileURL(join(here, '..', 'client.js')).href

function fakeReact() {
  return {
    createElement: (type, props, ...children) => ({ type, props: props ?? null, children }),
    Fragment: Symbol('Fragment'),
    Component: class {},
  }
}

async function loadBundle() {
  let spec
  const previousWindow = globalThis.window
  globalThis.window = { __ModuleLoader__: { load: entry => { spec = entry } } }
  try {
    await import(`${clientUrl}?contract=${Date.now()}-${Math.random()}`)
  } finally {
    globalThis.window = previousWindow
  }
  assert.ok(spec)
  return spec
}

test('client bundle registers the provider-aware accountPool contract without React dependencies', async () => {
  const spec = await loadBundle()
  assert.equal(spec.id, 'dsh-account-pool')
  const module = spec.factory(name => {
    if (name === 'react') return fakeReact()
    throw new Error(`unexpected dependency ${name}`)
  })
  const methods = module.__test.TYPERT_REMOTE.descriptors.map(descriptor => descriptor.method)
  assert.deepEqual(methods, [
    'status', 'setActive', 'setDisabled', 'clearInvalid', 'putKeys',
    'putKeySecret', 'putConfig', 'takeOverState', 'refreshModels',
  ])
  for (const descriptor of module.__test.TYPERT_REMOTE.descriptors) {
    assert.equal(descriptor.service, 'accountPool')
    assert.equal(descriptor.result.mode, 'strict')
    assert.ok(descriptor.parameters.every(parameter => parameter.codec.mode === 'strict'))
  }

  let registration
  module.apply({
    remote: { $mount: async () => {} },
    effect: fn => { fn(); return () => {} },
    locale: { register: () => () => {}, bind: () => key => key },
    slots: {
      inject: (_name, factory) => { factory() },
      register: (options, component) => { registration = { options, component } },
    },
    get: () => null,
  })
  assert.equal(registration.options.id, 'account-pool')
  assert.equal(registration.options.locale, 'settings.accountPool')
})
