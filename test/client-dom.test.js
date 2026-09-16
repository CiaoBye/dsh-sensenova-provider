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

let cached
function internals() {
  cached ??= loadBundle().__internals
  return cached
}

test('the bundle exposes its provider-card DOM helpers for testing', () => {
  const mod = loadBundle()
  assert.equal(typeof mod.apply, 'function')
  assert.ok(mod.__internals, 'the bundle should publish its DOM helpers')
  for (const key of ['classTokens', 'isEditorRoot', 'resolveAnchor', 'resolveCardContainer', 'editor']) {
    assert.equal(typeof mod.__internals[key], 'function', key)
  }
})

test('recognises an editor root by its css-module token', () => {
  const { isEditorRoot } = internals()
  assert.equal(isEditorRoot({ className: 'zGbnIq_editor' }), true)
  assert.equal(isEditorRoot({ className: 'GL8Viq_editor' }), true)
  assert.equal(isEditorRoot({ className: 'editor' }), true)
  // credential-only editors swap the root class to addBlock
  assert.equal(isEditorRoot({ className: 'zGbnIq_addBlock' }), true)
})

test('does not mistake an editor sub-part for the editor root', () => {
  const { isEditorRoot } = internals()
  const decoys = ['zGbnIq_editorActions', 'zGbnIq_editorHeader', 'zGbnIq_editorTitle', 'zGbnIq_editorRoute', 'sn-modelCard', 'zGbnIq_rowHead', 'zGbnIq_rowCard', 'zGbnIq_addBlockRow']
  for (const className of decoys) assert.equal(isEditorRoot({ className }), false, className)
})

test('tolerates missing or odd class attributes', () => {
  const { classTokens, isEditorRoot } = internals()
  // The helper runs in the vm realm, so spread its arrays before comparing.
  assert.deepEqual([...classTokens(null)], [])
  assert.deepEqual([...classTokens({})], [])
  assert.deepEqual([...classTokens({ className: 42 })], [])
  assert.deepEqual([...classTokens({ className: '  a   b ' })], ['a', 'b'])
  assert.equal(isEditorRoot(null), false)
  assert.equal(isEditorRoot({}), false)
})

test('finds the native editor on whichever side of the anchor it sits', () => {
  const { editor } = internals()
  const after = { className: 'slot', previousElementSibling: null, nextElementSibling: { className: 'zGbnIq_editor' } }
  assert.equal(editor(after).className, 'zGbnIq_editor')

  const before = { className: 'slot', previousElementSibling: { className: 'GL8Viq_editor' }, nextElementSibling: null }
  assert.equal(editor(before).className, 'GL8Viq_editor')

  const surrounded = { className: 'slot', previousElementSibling: { className: 'GL8Viq_editor' }, nextElementSibling: { className: 'zGbnIq_editor' } }
  assert.equal(editor(surrounded).className, 'zGbnIq_editor')
})

test('reports no editor when neither sibling is one', () => {
  const { editor } = internals()
  assert.equal(editor({ className: 'slot', previousElementSibling: { className: 'zGbnIq_rowHead' }, nextElementSibling: null }), null)
  assert.equal(editor({ className: 'slot', previousElementSibling: null, nextElementSibling: null }), null)
  assert.equal(editor(null), null)
  assert.equal(editor(undefined), null)
})

test('resolves the slot anchor through closest, falling back to the parent', () => {
  const { resolveAnchor } = internals()
  const anchorEl = { className: 'slot-anchor' }
  const viaClosest = { closest: (sel) => (sel.includes('settings.models.provider-card') ? anchorEl : null), parentElement: { className: 'other' } }
  assert.equal(resolveAnchor(viaClosest), anchorEl)

  const fallback = { className: 'slot-anchor' }
  assert.equal(resolveAnchor({ closest: () => null, parentElement: fallback }), fallback)

  // An element without closest (older/odd host) still resolves via the parent.
  assert.equal(resolveAnchor({ parentElement: fallback }), fallback)
  assert.equal(resolveAnchor(null), null)
})

test('walks up to the card list item that holds both slot and editor', () => {
  const { resolveCardContainer } = internals()
  const li = { tagName: 'LI', parentElement: null }
  const anchor = { parentElement: { tagName: 'DIV', parentElement: li } }
  assert.equal(resolveCardContainer(anchor), li)

  const direct = { tagName: 'DIV', parentElement: null }
  assert.equal(resolveCardContainer({ parentElement: direct }), direct)
  assert.equal(resolveCardContainer(null), null)
})
