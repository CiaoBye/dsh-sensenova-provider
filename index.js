import z from '@deepseek-ai/schemastery'
import { assertUsableApiKey } from '@deepseek-ai/dsh-llm'
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { SenseNovaAdapter } from './adapter.js'
import { KeyPool } from './pool.js'
import { RuntimeStateStore, defaultStateFilePath } from './state-store.js'
import { applyRuntimeRemote } from './runtime-remote.js'

export const name = 'llm-sensenova'
export const inject = ['llm']

const NS = 'llm-sensenova'
const PROVIDER = 'sensenova'
export const DEFAULT_API_BASE = 'https://token.sensenova.cn/v1'
export const DEFAULT_API_KEY_ENV = 'SENSENOVA_API_KEY'
export const DEFAULT_DISABLED_STATE_TTL_MS = 1_800_000

const KeySchema = z.object({
  id: z.string().default(''),
  label: z.string().default(''),
  apiKeyEnv: z.string().role('credential-ref').default(''),
})
const RuleSchema = z.object({
  models: z.array(z.string()).default([]),
  keyId: z.string().default(''),
})
const EffortOverrideSchema = z.object({
  model: z.string().default(''),
  efforts: z.array(z.string()).default([]),
})

export const Config = z.object({
  apiBase: z.string().default(DEFAULT_API_BASE),
  keys: z.array(KeySchema).default([{ id: 'default', label: 'Default', apiKeyEnv: DEFAULT_API_KEY_ENV }]),
  activeKey: z.string().default(''),
  modelKeyRules: z.array(RuleSchema).default([]),
  visibleModels: z.array(z.string()).default([]),
  reasoningEfforts: z.array(EffortOverrideSchema).default([]),
  cooldown429Ms: z.number().step(1).min(1).default(30_000),
  maxCooldown429Ms: z.number().step(1).min(1).default(120_000),
  connectTimeoutMs: z.number().step(1).min(1).default(45_000),
  streamIdleTimeoutMs: z.number().step(1).min(1).default(60_000),
  defaultContextWindow: z.number().step(1).min(1).default(131_072),
  persistRuntimeState: z.boolean().default(true),
  stateFilePath: z.string().default(''),
  disabledStateTtlMs: z.number().step(1).min(0).default(DEFAULT_DISABLED_STATE_TTL_MS),
})

function cleanStringArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
}

export function resolveConfig(raw = {}) {
  const apiBase = typeof raw.apiBase === 'string' && raw.apiBase.trim() ? raw.apiBase.trim().replace(/\/+$/, '') : DEFAULT_API_BASE
  const sourceKeys = Array.isArray(raw.keys) && raw.keys.length > 0
    ? raw.keys
    : [{ id: 'default', label: 'Default', apiKeyEnv: DEFAULT_API_KEY_ENV }]
  const ids = new Set()
  const refs = new Set()
  const keys = sourceKeys.map((entry, index) => {
    const id = typeof entry?.id === 'string' && entry.id.trim() ? entry.id.trim() : `key-${index + 1}`
    if (ids.has(id)) throw new Error(`llm-sensenova: duplicate key id "${id}"`)
    ids.add(id)
    const apiKeyEnv = typeof entry?.apiKeyEnv === 'string' ? entry.apiKeyEnv.trim() : ''
    if (!isCredentialRefName(apiKeyEnv)) throw new Error(`llm-sensenova: key "${id}" needs a valid credential reference`)
    if (refs.has(apiKeyEnv)) throw new Error(`llm-sensenova: duplicate credential reference "${apiKeyEnv}"`)
    refs.add(apiKeyEnv)
    return {
      id,
      label: typeof entry?.label === 'string' && entry.label.trim() ? entry.label.trim() : id,
      apiKeyEnv,
    }
  })
  const activeKey = typeof raw.activeKey === 'string' && ids.has(raw.activeKey.trim()) ? raw.activeKey.trim() : ''
  const modelKeyRules = Array.isArray(raw.modelKeyRules)
    ? raw.modelKeyRules.map(rule => ({
      models: cleanStringArray(rule?.models),
      keyId: typeof rule?.keyId === 'string' ? rule.keyId.trim() : '',
    })).filter(rule => rule.models.length > 0 && ids.has(rule.keyId))
    : []
  const visibleModels = cleanStringArray(raw.visibleModels)
  const reasoningEfforts = {}
  if (Array.isArray(raw.reasoningEfforts)) {
    for (const entry of raw.reasoningEfforts) {
      const model = typeof entry?.model === 'string' ? entry.model.trim() : ''
      const efforts = cleanStringArray(entry?.efforts)
      if (model && efforts.length > 0) reasoningEfforts[model] = efforts
    }
  }
  const cooldown429Ms = Number.isFinite(raw.cooldown429Ms) && raw.cooldown429Ms > 0 ? Math.floor(raw.cooldown429Ms) : 30_000
  const maxCooldown429Ms = Number.isFinite(raw.maxCooldown429Ms) && raw.maxCooldown429Ms > 0
    ? Math.max(cooldown429Ms, Math.floor(raw.maxCooldown429Ms))
    : Math.max(cooldown429Ms, 120_000)
  return {
    apiBase,
    keys,
    activeKey,
    modelKeyRules,
    visibleModels,
    reasoningEfforts,
    cooldown429Ms,
    maxCooldown429Ms,
    connectTimeoutMs: Number.isFinite(raw.connectTimeoutMs) && raw.connectTimeoutMs > 0 ? Math.floor(raw.connectTimeoutMs) : 45_000,
    streamIdleTimeoutMs: Number.isFinite(raw.streamIdleTimeoutMs) && raw.streamIdleTimeoutMs > 0 ? Math.floor(raw.streamIdleTimeoutMs) : 60_000,
    defaultContextWindow: Number.isFinite(raw.defaultContextWindow) && raw.defaultContextWindow > 0 ? Math.floor(raw.defaultContextWindow) : 131_072,
    persistRuntimeState: raw.persistRuntimeState !== false,
    stateFilePath: typeof raw.stateFilePath === 'string' ? raw.stateFilePath.trim() : '',
    disabledStateTtlMs: Number.isFinite(raw.disabledStateTtlMs) && raw.disabledStateTtlMs >= 0
      ? Math.floor(raw.disabledStateTtlMs)
      : DEFAULT_DISABLED_STATE_TTL_MS,
  }
}

export function apply(ctx, config) {
  let current = () => config
  let lastRaw
  let lastGood

  const options = () => {
    const raw = current()
    if (raw === lastRaw && lastGood) return lastGood
    try {
      const next = resolveConfig(raw)
      lastRaw = raw
      lastGood = next
      return next
    } catch (error) {
      if (!lastGood) throw error
      lastRaw = raw
      ctx.logger.error('llm-sensenova: keeping the last good configuration')
      ctx.logger.error(error)
      return lastGood
    }
  }
  options()

  const resolveSlotKey = async (slot) => {
    const refName = slot.apiKeyEnv
    const credentials = ctx.get('credentials')
    if (credentials) {
      const hit = await credentials.resolve(credentialRef(refName))
      if (hit?.value) return assertUsableApiKey(hit.value, 'llm-sensenova', refName)
    }
    const ambient = launchEnvironmentOf(ctx).get(refName)
    if (ambient?.value) return assertUsableApiKey(ambient.value, 'llm-sensenova', refName)
    return undefined
  }

  const stateStore = new RuntimeStateStore({ logger: ctx.logger })
  const syncStore = () => {
    const next = options()
    stateStore.filePath = next.persistRuntimeState
      ? (next.stateFilePath || defaultStateFilePath())
      : ''
  }
  syncStore()
  ctx.effect(() => () => stateStore.close(), 'llm-sensenova: runtime state')

  const pool = new KeyPool({
    slots: () => options().keys,
    resolveKey: resolveSlotKey,
    initialState: stateStore.load(),
    onStateChange: snapshot => stateStore.save(snapshot),
    disabledTtlMs: () => options().disabledStateTtlMs,
  })
  pool.persistence = stateStore.enabled ? 'file' : 'memory'

  const adapter = new SenseNovaAdapter({ options, pool })

  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER,
    displayName: 'SenseNova',
    settingsNs: NS,
    settingsPath: [],
  }])

  const registration = ctx.llm.registerAdapter([PROVIDER], adapter)
  applyRuntimeRemote(ctx, { pool, adapter, options })

  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, NS, Config, config, {
      setSource(source) { current = source },
      onChange() {
        lastRaw = undefined
        lastGood = undefined
        syncStore()
        pool.persistence = stateStore.enabled ? 'file' : 'memory'
        // Re-announce the same route so open Clients invalidate provider/model facts.
        registration.replace([PROVIDER])
      },
    })
  })
}
