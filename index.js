import z from '@deepseek-ai/schemastery'
import { assertUsableApiKey } from '@deepseek-ai/dsh-llm'
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { SenseNovaAdapter } from './adapter.js'
import { KeyPool } from './pool.js'

export const name = 'llm-sensenova'
export const inject = ['llm']

const NS = 'llm-sensenova'
const PROVIDER = 'sensenova'
export const DEFAULT_API_BASE = 'https://token.sensenova.cn/v1'
export const DEFAULT_API_KEY_ENV = 'SENSENOVA_API_KEY'

export const Config = z.object({
  apiBase: z.string().default(DEFAULT_API_BASE),
  keys: z.array(z.object({
    id: z.string().default(''),
    label: z.string().default(''),
    apiKeyEnv: z.string().role('credential-ref').default(''),
  })).default([{ id: 'default', label: 'Default', apiKeyEnv: DEFAULT_API_KEY_ENV }]),
  cooldown429Ms: z.number().step(1).min(1).default(30_000),
  maxCooldown429Ms: z.number().step(1).min(1).default(120_000),
  connectTimeoutMs: z.number().step(1).min(1).default(45_000),
  streamIdleTimeoutMs: z.number().step(1).min(1).default(60_000),
  defaultContextWindow: z.number().step(1).min(1).default(131_072),
})

export function resolveConfig(raw = {}) {
  const apiBase = typeof raw.apiBase === 'string' && raw.apiBase.trim() ? raw.apiBase.trim().replace(/\/+$/, '') : DEFAULT_API_BASE
  const sourceKeys = Array.isArray(raw.keys) && raw.keys.length > 0
    ? raw.keys
    : [{ id: 'default', label: 'Default', apiKeyEnv: DEFAULT_API_KEY_ENV }]
  const ids = new Set()
  const keys = sourceKeys.map((entry, index) => {
    const id = typeof entry?.id === 'string' && entry.id.trim() ? entry.id.trim() : `key-${index + 1}`
    if (ids.has(id)) throw new Error(`llm-sensenova: duplicate key id "${id}"`)
    ids.add(id)
    const apiKeyEnv = typeof entry?.apiKeyEnv === 'string' ? entry.apiKeyEnv.trim() : ''
    if (!isCredentialRefName(apiKeyEnv)) throw new Error(`llm-sensenova: key "${id}" needs a valid credential reference`)
    return {
      id,
      label: typeof entry?.label === 'string' && entry.label.trim() ? entry.label.trim() : id,
      apiKeyEnv,
    }
  })
  const cooldown429Ms = Number.isFinite(raw.cooldown429Ms) && raw.cooldown429Ms > 0 ? Math.floor(raw.cooldown429Ms) : 30_000
  const maxCooldown429Ms = Number.isFinite(raw.maxCooldown429Ms) && raw.maxCooldown429Ms > 0
    ? Math.max(cooldown429Ms, Math.floor(raw.maxCooldown429Ms))
    : Math.max(cooldown429Ms, 120_000)
  return {
    apiBase,
    keys,
    cooldown429Ms,
    maxCooldown429Ms,
    connectTimeoutMs: Number.isFinite(raw.connectTimeoutMs) && raw.connectTimeoutMs > 0 ? Math.floor(raw.connectTimeoutMs) : 45_000,
    streamIdleTimeoutMs: Number.isFinite(raw.streamIdleTimeoutMs) && raw.streamIdleTimeoutMs > 0 ? Math.floor(raw.streamIdleTimeoutMs) : 60_000,
    defaultContextWindow: Number.isFinite(raw.defaultContextWindow) && raw.defaultContextWindow > 0 ? Math.floor(raw.defaultContextWindow) : 131_072,
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

  const pool = new KeyPool({
    slots: () => options().keys,
    resolveKey: resolveSlotKey,
  })
  const adapter = new SenseNovaAdapter({ options, pool })

  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER,
    displayName: 'SenseNova',
    settingsNs: NS,
    settingsPath: [],
  }])

  const registration = ctx.llm.registerAdapter([PROVIDER], adapter)
  let registeredMaxCooldown = options().maxCooldown429Ms
  const refreshRegistrationFacts = () => {
    const next = options().maxCooldown429Ms
    if (next === registeredMaxCooldown) return
    registration.replace([PROVIDER])
    registeredMaxCooldown = next
  }

  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, NS, Config, config, {
      setSource(source) { current = source },
      onChange() {
        lastRaw = undefined
        lastGood = undefined
        refreshRegistrationFacts()
      },
    })
  })
}
