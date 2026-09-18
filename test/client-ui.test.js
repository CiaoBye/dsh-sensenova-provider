import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.resolve(here, '..')
function loadBundle() {
  const code = fs.readFileSync(path.join(root, 'client.js'), 'utf8'); let registration
  vm.runInNewContext(code, { console, window: { __ModuleLoader__: { load(value) { registration = value } } } }, { filename: 'client.js' })
  assert.equal(registration.id, '@ciaobye/dsh-sensenova-provider')
  return registration.factory((name) => { if (name === 'react') return { createElement(){}, useState(){ return [false,()=>{}] }, useEffect(){}, useRef(){ return { current:null } } }; throw new Error(`unexpected require: ${name}`) })
}
test('browser bundle exports DSH client plugin with LLM remote access', () => { const mod=loadBundle(); assert.equal(typeof mod.apply,'function'); assert.ok(mod.inject.includes('settingsScope')); assert.ok(mod.inject.includes('remote.credentials')); assert.ok(mod.inject.includes('remote.llm')) })
test('client registers SenseNova settings and models-card surfaces', () => {
  const mod=loadBundle(), registered=[]; const scope={ getSnapshot:()=>({status:'ready',value:{},base:{},user:{},writable:true}), subscribe:()=>()=>{}, mutate:async()=>{} };
  const ctx={ effect(){}, inject(){}, locale:{register(){return()=>{}},bind(){return(k)=>k}}, remote:{credentials:{describe:async()=>({ok:true,value:{}})},llm:{discoverModels:async()=>({ok:true,value:[]})},$on(){return()=>{}}}, settingsScope:{bind(){return scope}}, slots:{inject(_n,fn){fn()},register(meta,component){registered.push({meta,component});return()=>{}}} };
  mod.apply(ctx); assert.equal(registered.find(x=>x.meta.name==='settings.section').meta.id,'sensenova'); assert.equal(registered.find(x=>x.meta.name==='settings.models.provider-card').meta.key,'llm-sensenova')
})
test('package declares the exact DSH releases it was verified against', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.version, '0.4.0-alpha.1')
  assert.equal(pkg.exports['./client'].default, './client.js')
  assert.ok(pkg.files.includes('runtime-remote.js'))
  // One entry per release the plugin was actually exercised against, pinned
  // exactly: a release that runs but is unlisted reads as unverified, so the
  // follow-up for a new DSH release is to test it and add its version here.
  assert.deepEqual(pkg.dsh.compatibility.dshReleases, {
    '0.1.6-alpha.1': 'compatible',
    '0.1.6-alpha.2': 'compatible',
  })
  // `engines.dsh` is the official package-manifest field for the same claim
  // (`dsh.compatibility` is this plugin's own map), so both must stay in step.
  assert.equal(pkg.engines.dsh, '>=0.1.6-alpha.1 <0.2.0')
})
