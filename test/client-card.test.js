import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const instances = []

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback
    this.disconnected = false
    this.observations = []
    instances.push(this)
  }
  observe(target, options) {
    this.observations.push({ target, options })
  }
  disconnect() {
    this.disconnected = true
  }
  trigger() {
    this.callback([])
  }
}

function loadBundle(MutationObserverCtor) {
  const code = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
  let registration
  const sandbox = { console, window: { __ModuleLoader__: { load(value) { registration = value } } } }
  if (MutationObserverCtor) sandbox.MutationObserver = MutationObserverCtor
  vm.runInNewContext(code, sandbox, { filename: 'client.js' })
  return registration.factory((name) => {
    if (name === 'react') return { createElement() {}, useState() { return [false, () => {}] }, useEffect() {}, useRef() { return { current: null } } }
    throw new Error(`unexpected require: ${name}`)
  })
}

const mod = loadBundle(FakeMutationObserver)
const bareMod = loadBundle(undefined)

/**
 * A stand-in for the Models page card: <li> holding the slot anchor (which
 * wraps our card root) and, when open, the native editor as a sibling.
 */
function makeDom({ withEditor = true, editorDisplay = '' } = {}) {
  const li = { tagName: 'LI', className: 'rowCard', parentElement: null }
  const anchor = { className: 'slot-anchor', parentElement: li, nextElementSibling: null, previousElementSibling: null }
  anchor.closest = () => anchor
  const dom = {
    li,
    anchor,
    root: { className: 'sn-modelCard', parentElement: anchor },
    editor: null,
    addEditor(display = '') {
      const el = { className: 'zGbnIq_editor', style: { display }, parentElement: li, previousElementSibling: anchor, nextElementSibling: null }
      anchor.nextElementSibling = el
      dom.editor = el
      return el
    },
    removeEditor() {
      anchor.nextElementSibling = null
      dom.editor = null
    },
  }
  if (withEditor) dom.addEditor(editorDisplay)
  return dom
}

function openState(initial) {
  let value = initial
  return {
    set(next) { value = typeof next === 'function' ? next(value) : next },
    get: () => value,
  }
}

test('hides an already-open native editor and shows our card', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: true })
  const open = openState(false)
  mod.__internals.attachEditorSuppression(dom.root, open.set)
  assert.equal(dom.editor.style.display, 'none')
  assert.equal(open.get(), true)
})

test('leaves the card hidden when no editor is open', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: false })
  const open = openState(true)
  mod.__internals.attachEditorSuppression(dom.root, open.set)
  assert.equal(open.get(), false)
})

test('observes the card container for subtree changes', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: false })
  mod.__internals.attachEditorSuppression(dom.root, openState(false).set)
  assert.equal(instances.length, 1)
  const [observation] = instances[0].observations
  assert.equal(observation.target, dom.li)
  assert.deepEqual({ ...observation.options }, { childList: true, subtree: true })
})

test('picks up an editor that opens later, via the observer', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: false })
  const open = openState(false)
  mod.__internals.attachEditorSuppression(dom.root, open.set)
  assert.equal(open.get(), false)

  dom.addEditor()
  instances[0].trigger()
  assert.equal(dom.editor.style.display, 'none')
  assert.equal(open.get(), true)
})

test('hides a replacement editor node after the original one closes', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: true })
  const open = openState(false)
  mod.__internals.attachEditorSuppression(dom.root, open.set)
  const first = dom.editor

  dom.removeEditor()
  instances[0].trigger()
  assert.equal(open.get(), false)
  assert.equal(first.style.display, 'none')

  dom.addEditor()
  instances[0].trigger()
  assert.equal(dom.editor.style.display, 'none')
  assert.equal(open.get(), true)
})

test('cleanup restores the exact original display value, not an empty one', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: true, editorDisplay: 'flex' })
  const cleanup = mod.__internals.attachEditorSuppression(dom.root, openState(false).set)
  assert.equal(dom.editor.style.display, 'none')

  cleanup()
  assert.equal(dom.editor.style.display, 'flex')
})

test('cleanup restores an unset display to unset', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: true, editorDisplay: '' })
  const cleanup = mod.__internals.attachEditorSuppression(dom.root, openState(false).set)
  cleanup()
  assert.equal(dom.editor.style.display, '')
})

test('cleanup disconnects the observer', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: true })
  const cleanup = mod.__internals.attachEditorSuppression(dom.root, openState(false).set)
  cleanup()
  assert.equal(instances[0].disconnected, true)
})

test('repeated syncs are idempotent for the same editor node', () => {
  instances.length = 0
  const dom = makeDom({ withEditor: true, editorDisplay: 'block' })
  const cleanup = mod.__internals.attachEditorSuppression(dom.root, openState(false).set)
  instances[0].trigger()
  instances[0].trigger()
  cleanup()
  // A second hide would have overwritten the saved original with 'none'.
  assert.equal(dom.editor.style.display, 'block')
})

test('degrades to a no-op without MutationObserver or a resolvable root', () => {
  const dom = makeDom({ withEditor: true })
  const untouched = bareMod.__internals.attachEditorSuppression(dom.root, openState(false).set)
  assert.equal(typeof untouched, 'function')
  assert.equal(dom.editor.style.display, '')
  untouched()

  const detached = mod.__internals.attachEditorSuppression(null, openState(false).set)
  assert.equal(typeof detached, 'function')
  detached()
})

test('does not install an observer when the anchor cannot be resolved', () => {
  instances.length = 0
  const orphan = { className: 'sn-modelCard', parentElement: null, closest: () => null }
  mod.__internals.attachEditorSuppression(orphan, openState(false).set)
  assert.equal(instances.length, 0)
})
