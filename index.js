/**
 * Host half of dsh-account-pool.
 *
 * One provider-neutral LLM adapter owns the configured DSH routes and selects
 * an account pool by provider. Provider-specific protocol, usage, catalog and
 * failure facts live in drivers.js; KeyPool remains a pure state machine.
 *
 * @module dsh-account-pool
 */

import z from '@deepseek-ai/schemastery'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import {
  assertUsableApiKey,
  LlmAdapter,
  LlmError,
  resolveRetryPolicy,
} from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import { PROVIDER_DRIVERS, PROVIDER_IDS, getProviderDriver } from './drivers.js'
import { mergeLiveModels } from './catalog.js'
import { KeyPool, assertKeyList, QUOTA_CODE } from './pool.js'
import { fetchOpenRouterUsage, fetchUsage, UsageCache } from './usage.js'

export const name = 'dsh-account-pool'

const NS = settingsNamespace('dsh-account-pool')
const DEFAULT_CATALOG_REFRESH_MS = 300000
const BASE_RETRYABLE_CODES = ['EMPTY_RESPONSE', 'RATE_LIMIT', 'SERVER', 'TIMEOUT', 'TRANSPORT']

const keyEntry = z.object({
  id: z.string(),
  label: z.string(),
  apiKeyEnv: z.string().role('credential-ref'),
})

const providerSection = z.object({
  enabled: z.boolean().default(true),
  takeover: z.boolean().default(true),
  keys: z.array(keyEntry).default([]),
  preemptAtPercent: z.number().min(0).max(100).default(100),
  switchAfterConsecutiveFailures: z.number().min(0).max(20).default(0),
  modelMode: z.union(['all', 'custom']).default('all'),
  models: z.array(z.string()).default([]),
  usageBaseUrl: z.string().default(''),
  modelsBaseUrl: z.string().default(''),
  usageRefreshMs: z.number().min(5000).max(300000).default(30000),
  catalogRefreshMs: z.number().min(30000).max(86400000).default(DEFAULT_CATALOG_REFRESH_MS),
  timeoutMs: z.number().min(1000).max(120000).default(15000),
})

export const Config = z.object({
  providers: z.object({
    'opencode-go': providerSection.default({}),
    opencode: providerSection.default({}),
    openrouter: providerSection.default({}),
  }).default({}),
})

function validateSection(value) {
  const providers = value && value.providers ? value.providers : {}
  for (const id of PROVIDER_IDS) assertKeyList(providers[id]?.keys ?? [])
}

function defaultSection(id) {
  const driver = getProviderDriver(id)
  return {
    enabled: true,
    takeover: true,
    keys: [],
    preemptAtPercent: 100,
    switchAfterConsecutiveFailures: 0,
    modelMode: 'all',
    models: [],
    usageBaseUrl: driver?.defaultUsageBaseUrl ?? '',
    modelsBaseUrl: driver?.defaultModelsUrl ?? '',
    usageRefreshMs: driver?.defaultUsageRefreshMs ?? 30000,
    catalogRefreshMs: DEFAULT_CATALOG_REFRESH_MS,
    timeoutMs: driver?.defaultTimeoutMs ?? 15000,
  }
}

/** Normalize settings documents and migrate the original Go-only shape. */
function normalizeConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const sections = input.providers && typeof input.providers === 'object' ? input.providers : {}
  const legacyGo = Object.keys(sections).length === 0 && (
    input.keys !== undefined || input.route !== undefined || input.usageBaseUrl !== undefined
  ) ? input : null
  const providers = {}
  for (const id of PROVIDER_IDS) {
    const source = sections[id] ?? (id === 'opencode-go' ? legacyGo : null) ?? {}
    providers[id] = { ...defaultSection(id), ...source }
    const driver = getProviderDriver(id)
    // The schemastery document intentionally uses empty strings so the
    // provider-specific defaults stay in one driver table. Reapply those
    // defaults after schema resolution; otherwise every live catalog/usage
    // request would silently target an empty URL.
    if (!providers[id].usageBaseUrl && driver?.defaultUsageBaseUrl) {
      providers[id].usageBaseUrl = driver.defaultUsageBaseUrl
    }
    if (!providers[id].modelsBaseUrl && driver?.defaultModelsUrl) {
      providers[id].modelsBaseUrl = driver.defaultModelsUrl
    }
    if (!Array.isArray(providers[id].keys)) providers[id].keys = []
    if (!Array.isArray(providers[id].models)) providers[id].models = []
  }
  return { providers }
}

/** Convert the original flat Go-only composition entry into the new shape. */
function migrateEntryConfig(raw) {
  if (!raw || typeof raw !== 'object') return {}
  if (raw.providers && typeof raw.providers === 'object') return raw
  const legacyFields = [
    'keys', 'route', 'preemptAtPercent', 'switchAfterConsecutiveFailures',
    'modelMode', 'models', 'usageBaseUrl', 'usageRefreshMs', 'timeoutMs',
  ]
  if (!legacyFields.some(field => raw[field] !== undefined)) return raw
  const { providers: _ignored, ...legacy } = raw
  return { providers: { 'opencode-go': legacy } }
}

function dryPoolFinish(message) {
  return {
    type: 'finish',
    reason: { kind: 'error', failure: { code: QUOTA_CODE, message } },
  }
}

function isContentChunk(chunk) {
  return chunk.type === 'block-start'
    || chunk.type === 'text-delta'
    || chunk.type === 'reasoning-delta'
    || chunk.type === 'tool-call-delta'
    || chunk.type === 'block-end'
}

function failureOf(error) {
  if (error && typeof error === 'object'
      && (typeof error.code === 'string' || typeof error.message === 'string')) {
    return error
  }
  return null
}

function errorText(error) {
  return String((error && error.message) || error)
}

async function fetchJson(url, { headers = {}, timeoutMs = 15000 } = {}) {
  if (typeof fetch !== 'function') throw new Error('fetch is not available')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

function cloneProviderWithCatalog(provider, catalog) {
  return {
    ...provider,
    getModels: () => catalog.models,
  }
}

/** Provider-neutral adapter with per-provider account failover. */
class AccountPoolAdapter extends LlmAdapter {
  constructor(plugin) {
    super()
    this.plugin = plugin
  }

  providerInfo(provider) {
    const driver = this.plugin.driverFor(provider)
    return { id: provider, name: driver?.displayName ?? provider }
  }

  providerRetryPolicy(provider) {
    const pool = this.plugin.poolFor(provider)
    const budget = Math.max(2, pool ? pool.keyCount() : 0)
    return resolveRetryPolicy({
      mode: 'normal',
      maxRetries: budget,
      retryableCodes: [...BASE_RETRYABLE_CODES, QUOTA_CODE],
    }, `dsh-account-pool.${provider}.retryPolicy`)
  }

  async listModels(provider) {
    const driver = this.plugin.driverFor(provider)
    if (!driver) return []
    await this.plugin.refreshCatalog(provider)
    const list = await this.plugin.innerCatalog.listModels(provider)
    const selection = this.plugin.modelSelection(provider)
    if (selection === null) return list
    return list.filter(entry => selection.has(entry.id))
  }

  async resolveModel(provider, model, signal) {
    const driver = this.plugin.driverFor(provider)
    if (!driver) throw new LlmError(`unknown account-pool provider "${provider}"`, 'UNKNOWN_PROVIDER')
    const selection = this.plugin.modelSelection(provider)
    if (selection !== null && !selection.has(model)) {
      throw new LlmError(
        `model "${model}" is not enabled in the ${driver.displayName} account pool model selection`,
        'UNKNOWN_MODEL',
      )
    }
    await this.plugin.refreshCatalog(provider)
    return this.plugin.innerCatalog.resolveModel(provider, model, signal)
  }

  async *stream(options) {
    const provider = options.provider
    const driver = this.plugin.driverFor(provider)
    if (!driver) throw new LlmError(`unknown account-pool provider "${provider}"`, 'UNKNOWN_PROVIDER')
    const selection = this.plugin.modelSelection(provider)
    if (selection !== null && options.model && !selection.has(options.model)) {
      throw new LlmError(
        `model "${options.model}" is not enabled in the ${driver.displayName} account pool model selection`,
        'UNKNOWN_MODEL',
      )
    }
    const pool = this.plugin.poolFor(provider)
    const attempts = pool.usableCount() + 1
    for (let attempt = 0; attempt < attempts; attempt++) {
      const entry = pool.currentKey()
      if (!entry) {
        yield dryPoolFinish(`${driver.displayName} account pool: every key is exhausted, disabled, or invalid`)
        return
      }
      const inner = this.plugin.makeAttemptAdapter(provider, entry)
      let emitted = false
      let silentRetry = false
      let finish = null
      try {
        for await (const chunk of inner.stream(options)) {
          if (chunk.type === 'finish') {
            if (chunk.reason.kind === 'error') {
              const failure = driver.classifyFailure(chunk.reason.failure)
              const rotation = pool.onFailure(entry.id, failure)
              if (rotation !== null) silentRetry = !emitted
            } else if (chunk.reason.kind !== 'aborted') {
              pool.onSuccess(entry.id)
            }
            finish = chunk
            break
          }
          if (isContentChunk(chunk)) emitted = true
          yield chunk
        }
      } catch (error) {
        const rawFailure = failureOf(error)
        if (!rawFailure) throw error
        const failure = driver.classifyFailure(rawFailure)
        const rotation = pool.onFailure(entry.id, failure)
        if (rotation !== null && !emitted) silentRetry = true
        else throw error
      }
      if (silentRetry) continue
      if (finish !== null) {
        yield finish
        return
      }
      return
    }
  }
}

/** Host plugin service and Typert Remote implementation. */
export class DshAccountPool extends TypertRemoteService {
  static inject = ['llm', 'credentials', 'settings']
  static Config = Config

  constructor(ctx, config) {
    super(ctx, 'accountPool')
    this.ctx = ctx
    this.logger = ctx.logger ?? console
    this.scope = ctx.settings.register(NS, Config, {
      base: migrateEntryConfig(config),
      validate: validateSection,
    })
    this.current = () => normalizeConfig(this.scope.get())

    this.pools = new Map()
    this.catalogs = new Map()
    this.profileMap = new Map()
    this.registrations = new Map()
    this.serving = new Set()
    this.lastTakeoverErrors = new Map()
    this.usageCache = new UsageCache({ ttlMs: 15000 })

    for (const id of PROVIDER_IDS) {
      const driver = PROVIDER_DRIVERS[id]
      const baseProvider = driver.createProvider()
      const staticModels = [...baseProvider.getModels()]
      const catalog = {
        baseProvider,
        staticModels,
        models: staticModels,
        checkedAt: 0,
        error: null,
        inflight: null,
      }
      catalog.provider = cloneProviderWithCatalog(baseProvider, catalog)
      this.catalogs.set(id, catalog)
      this.profileMap.set(id, driver.buildProfile(catalog.provider, resolveRetryPolicy))
      this.pools.set(id, new KeyPool({
        stateFile: dshHomePath(`dsh-account-pool.${id}.state.json`),
        reviveThresholdPercent: 98,
      }))
    }
    this.innerCatalog = new PiAiAdapter({
      profiles: () => this.profileMap,
      resolveApiKey: async () => {
        throw new Error('dsh-account-pool: catalog adapter never resolves account keys')
      },
      resolveAttachments: () => this.ctx.get('attachments'),
    })
    this.poolAdapter = new AccountPoolAdapter(this)

    this.applyConfig()
    this.scope.watch(() => this.applyConfig())
    this.offAdaptersUpdated = ctx.on('llm/adapters-updated', () => this.tryRegisterAll())
    this.tryRegisterAll()
  }

  driverFor(provider) {
    return getProviderDriver(provider)
  }

  poolFor(provider) {
    return this.pools.get(provider) ?? null
  }

  providerConfig(provider) {
    return this.current().providers[provider] ?? null
  }

  applyConfig() {
    const cfg = this.current()
    for (const id of PROVIDER_IDS) {
      const section = cfg.providers[id]
      const pool = this.poolFor(id)
      pool.setPreempt(section.preemptAtPercent)
      pool.setConsecutiveThreshold(section.switchAfterConsecutiveFailures)
      pool.syncKeys(section.keys)
      // The DSH registry captures retry policy facts when a route is
      // registered. Key-count changes alter that budget, so re-announce a
      // serving route after settings commits.
      if (this.serving.has(id)) this.announceAdapterChange(id)
    }
    this.tryRegisterAll()
  }

  modelSelection(provider) {
    const cfg = this.providerConfig(provider)
    if (!cfg || cfg.modelMode !== 'custom') return null
    return new Set(Array.isArray(cfg.models) ? cfg.models : [])
  }

  async refreshCatalog(provider, force = false) {
    const driver = this.driverFor(provider)
    const catalog = this.catalogs.get(provider)
    const cfg = this.providerConfig(provider)
    if (!driver || !catalog || !cfg || !cfg.modelsBaseUrl) return catalog
    const now = Date.now()
    if (!force && catalog.checkedAt > 0 && now - catalog.checkedAt < cfg.catalogRefreshMs) return catalog
    if (catalog.inflight) return catalog.inflight
    catalog.inflight = (async () => {
      try {
        let apiKey
        if (provider === 'openrouter') {
          const active = this.poolFor(provider)?.currentKey()
          if (active) {
            try { apiKey = await this.resolveKeyValue(provider, active) } catch { apiKey = undefined }
          }
        }
        const body = await fetchJson(cfg.modelsBaseUrl, {
          timeoutMs: cfg.timeoutMs,
          headers: {
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            Accept: 'application/json',
          },
        })
        const next = mergeLiveModels(provider, catalog.staticModels, body)
        const changed = JSON.stringify(next) !== JSON.stringify(catalog.models)
        catalog.models = next
        catalog.error = null
        if (changed) {
          // PiAiAdapter memoizes the Models collection by profile-map
          // identity. Publish a fresh profile map so the live catalog is
          // visible to listModels, resolveModel and subsequent streams while
          // in-flight calls keep their old snapshot.
          const driver = this.driverFor(provider)
          const nextProfiles = new Map(this.profileMap)
          nextProfiles.set(provider, driver.buildProfile(catalog.provider, resolveRetryPolicy))
          this.profileMap = nextProfiles
          this.announceAdapterChange(provider)
        }
      } catch (error) {
        catalog.error = errorText(error)
      } finally {
        catalog.checkedAt = Date.now()
        catalog.inflight = null
      }
      return catalog
    })()
    return catalog.inflight
  }

  announceAdapterChange(provider) {
    const registration = this.registrations.get(provider)
    if (!registration || !this.serving.has(provider)) return
    try {
      registration.replace([provider])
    } catch (error) {
      this.logger?.warn?.(`[dsh-account-pool] catalog re-announce failed for ${provider}: ${errorText(error)}`)
    }
  }

  tryRegisterAll() {
    for (const id of PROVIDER_IDS) this.tryRegister(id)
  }

  tryRegister(provider) {
    const section = this.providerConfig(provider)
    if (!section) return
    if (!section.enabled || !section.takeover) {
      this.unserve(provider)
      return
    }
    if (this.serving.has(provider)) return
    try {
      let registration = this.registrations.get(provider)
      if (!registration) {
        registration = this.ctx.llm.registerAdapter([provider], this.poolAdapter)
        this.registrations.set(provider, registration)
      } else {
        registration.replace([provider])
      }
      this.serving.add(provider)
      this.lastTakeoverErrors.delete(provider)
      this.logger?.info?.(`[dsh-account-pool] serving provider route "${provider}"`)
    } catch (error) {
      this.lastTakeoverErrors.set(provider, errorText(error))
      this.logger?.warn?.(`[dsh-account-pool] route "${provider}" unavailable: ${errorText(error)}`)
    }
  }

  unserve(provider) {
    const registration = this.registrations.get(provider)
    if (!registration || !this.serving.has(provider)) return
    try {
      registration.replace([])
    } catch (error) {
      this.logger?.warn?.(`[dsh-account-pool] route release failed for ${provider}: ${errorText(error)}`)
    }
    this.serving.delete(provider)
  }

  takeoverState(provider) {
    const section = this.providerConfig(provider)
    if (!section || !section.enabled || !section.takeover) return 'disabled'
    return this.serving.has(provider) ? 'serving' : 'waiting'
  }

  makeAttemptAdapter(provider, entry) {
    return new PiAiAdapter({
      profiles: () => this.profileMap,
      resolveApiKey: () => this.resolveKeyValue(provider, entry),
      resolveAttachments: () => this.ctx.get('attachments'),
    })
  }

  async resolveKeyValue(provider, entry) {
    const credentials = this.ctx.get('credentials')
    const ref = credentialRef(entry.apiKeyEnv)
    let hit
    if (credentials) {
      try {
        hit = (await credentials.resolve(ref))?.value
      } catch {
        hit = undefined
      }
    }
    if (!hit || hit.length === 0) {
      const name = this.driverFor(provider)?.displayName ?? provider
      throw new LlmError(
        `dsh-account-pool: no credential for ${name} key "${entry.id}" (${entry.apiKeyEnv})`,
        'MISSING_CREDENTIAL',
      )
    }
    return assertUsableApiKey(hit, 'dsh-account-pool', ref)
  }

  async listAvailableModels(provider, { refresh = true } = {}) {
    const catalog = refresh
      ? await this.refreshCatalog(provider)
      : this.catalogs.get(provider)
    const list = catalog ? catalog.models : []
    const selection = this.modelSelection(provider)
    return list.map(entry => ({
      id: entry.id,
      name: entry.name ?? entry.id,
      enabled: selection === null || selection.has(entry.id),
    }))
  }

  async providerStatus(provider) {
    const driver = this.driverFor(provider)
    const cfg = this.providerConfig(provider)
    const pool = this.poolFor(provider)
    const entries = pool.entries()
    // status() is polled by the settings page and must not turn every page
    // refresh into three external catalog requests. listModels/resolveModel
    // still refresh the live catalog on demand, and the page exposes an
    // explicit refreshModels action.
    const catalog = this.catalogs.get(provider)
    const availableModels = await this.listAvailableModels(provider, { refresh: false })
    const usageResults = await Promise.all(entries.map(async entry => {
      let key
      try {
        key = await this.resolveKeyValue(provider, entry)
      } catch (error) {
        return {
          id: entry.id,
          usage: null,
          usageError: error.code === 'MISSING_CREDENTIAL' ? 'no-api-key' : 'credential',
          fetchedAt: null,
          credentialSet: false,
        }
      }
      if (driver.usageKind === 'unsupported') {
        return {
          id: entry.id,
          usage: null,
          usageError: 'unsupported',
          fetchedAt: null,
          credentialSet: true,
        }
      }
      try {
        const usage = await this.usageCache.get(`${provider}:${entry.id}`, () => {
          const options = {
            baseUrl: cfg.usageBaseUrl,
            apiKey: key,
            timeoutMs: cfg.timeoutMs,
          }
          return provider === 'openrouter' ? fetchOpenRouterUsage(options) : fetchUsage(options)
        })
        // Usage drives both preemption and eventual revival. Provider drivers
        // classify whether the endpoint is authoritative, but the pool must
        // retain the facts even for a provider that has no auto-revive policy.
        pool.onUsage(entry.id, usage)
        return {
          id: entry.id,
          usage,
          usageError: null,
          fetchedAt: new Date().toISOString(),
          credentialSet: true,
        }
      } catch (error) {
        return {
          id: entry.id,
          usage: null,
          usageError: error?.code ?? 'network',
          fetchedAt: null,
          credentialSet: true,
        }
      }
    }))
    return {
      id: provider,
      displayName: driver.displayName,
      route: provider,
      enabled: cfg.enabled,
      takeover: this.takeoverState(provider),
      takeoverHint: this.lastTakeoverErrors.get(provider) ?? null,
      usageKind: driver.usageKind,
      canPreemptByUsage: driver.canPreemptByUsage,
      canAutoRevive: driver.canAutoRevive,
      usageRefreshMs: cfg.usageRefreshMs,
      catalogRefreshMs: cfg.catalogRefreshMs,
      catalogError: catalog?.error ?? null,
      preemptAtPercent: cfg.preemptAtPercent,
      switchAfterConsecutiveFailures: cfg.switchAfterConsecutiveFailures,
      modelMode: cfg.modelMode,
      availableModels,
      activeId: pool.activeId,
      lastSwitch: pool.lastSwitch,
      keys: entries.map(entry => {
        const state = pool.stateOf(entry.id)
        const usage = usageResults.find(item => item.id === entry.id)
        return {
          id: entry.id,
          label: entry.label,
          apiKeyEnv: entry.apiKeyEnv,
          state: state.state,
          active: entry.id === pool.activeId,
          usage: usage?.usage ?? null,
          usageError: usage?.usageError ?? null,
          fetchedAt: usage?.fetchedAt ?? null,
          credentialSet: usage?.credentialSet ?? false,
          lastFailure: state.lastFailure ?? null,
        }
      }),
    }
  }

  async status() {
    return {
      version: 1,
      providers: await Promise.all(PROVIDER_IDS.map(provider => this.providerStatus(provider))),
    }
  }

  assertProvider(provider) {
    const driver = this.driverFor(provider)
    if (!driver) throw new Error(`unsupported provider "${provider}"`)
    return driver
  }

  async setActive(provider, id) {
    this.assertProvider(provider)
    this.poolFor(provider).setActive(id)
    return true
  }

  async setDisabled(provider, id, on) {
    this.assertProvider(provider)
    this.poolFor(provider).setDisabled(id, on)
    return true
  }

  async clearInvalid(provider, id) {
    this.assertProvider(provider)
    this.poolFor(provider).clearInvalid(id)
    return true
  }

  async updateProvider(provider, patch) {
    this.assertProvider(provider)
    const current = this.current().providers
    const next = Object.fromEntries(PROVIDER_IDS.map(id => [
      id,
      { ...current[id], ...(id === provider ? patch : {}) },
    ]))
    await this.scope.update({ providers: next })
  }

  async putKeys(provider, keys) {
    this.assertProvider(provider)
    assertKeyList(keys)
    await this.updateProvider(provider, { keys })
    return true
  }

  async putKeySecret(provider, id, secret) {
    this.assertProvider(provider)
    const entry = this.poolFor(provider).entries().find(item => item.id === id)
    if (!entry) throw new Error(`unknown key "${id}"`)
    if (typeof secret !== 'string' || secret.trim().length === 0) {
      throw new Error(`key "${id}" needs a non-empty secret`)
    }
    const credentials = this.ctx.get('credentials')
    if (!credentials || typeof credentials.set !== 'function') {
      throw new Error('no credentials service is mounted — set the key through the credentials page instead')
    }
    const ref = credentialRef(entry.apiKeyEnv)
    const usable = assertUsableApiKey(secret.trim(), 'dsh-account-pool', ref)
    await credentials.set(ref, usable)
    this.poolFor(provider).clearInvalid(id)
    this.usageCache.invalidate(`${provider}:${id}`)
    return true
  }

  async putConfig(provider, config) {
    this.assertProvider(provider)
    if (!config || typeof config !== 'object') throw new Error('putConfig needs an object')
    const patch = {}
    const booleanFields = ['enabled', 'takeover']
    for (const field of booleanFields) {
      if (config[field] !== undefined) {
        if (typeof config[field] !== 'boolean') throw new Error(`${field} must be boolean`)
        patch[field] = config[field]
      }
    }
    if (config.preemptAtPercent !== undefined) {
      const value = Number(config.preemptAtPercent)
      if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('preemptAtPercent must be 0..100')
      patch.preemptAtPercent = value
    }
    if (config.switchAfterConsecutiveFailures !== undefined) {
      const value = Number(config.switchAfterConsecutiveFailures)
      if (!Number.isFinite(value) || value < 0 || value > 20) throw new Error('switchAfterConsecutiveFailures must be 0..20')
      patch.switchAfterConsecutiveFailures = value
    }
    if (config.modelMode !== undefined) {
      if (config.modelMode !== 'all' && config.modelMode !== 'custom') throw new Error('modelMode must be "all" or "custom"')
      patch.modelMode = config.modelMode
    }
    if (config.models !== undefined) {
      if (!Array.isArray(config.models) || config.models.some(id => typeof id !== 'string' || id.trim().length === 0)) {
        throw new Error('models must be an array of non-empty model ids')
      }
      patch.models = [...new Set(config.models.map(id => id.trim()))]
    }
    for (const field of ['usageBaseUrl', 'modelsBaseUrl']) {
      if (config[field] !== undefined) {
        if (typeof config[field] !== 'string') throw new Error(`${field} must be a string`)
        patch[field] = config[field].trim()
      }
    }
    for (const field of ['usageRefreshMs', 'catalogRefreshMs', 'timeoutMs']) {
      if (config[field] !== undefined) {
        const value = Number(config[field])
        if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} must be positive`)
        patch[field] = value
      }
    }
    if (Object.keys(patch).length === 0) throw new Error('putConfig received no known fields')
    const effective = { ...this.providerConfig(provider), ...patch }
    if (effective.modelMode === 'custom' && effective.models.length === 0) {
      throw new Error('custom model selection needs at least one model — pick models or use modelMode "all"')
    }
    await this.updateProvider(provider, patch)
    return true
  }

  async takeOverState(provider) {
    this.assertProvider(provider)
    return this.takeoverState(provider)
  }

  async refreshModels(provider) {
    this.assertProvider(provider)
    await this.refreshCatalog(provider, true)
    return true
  }
}

export { AccountPoolAdapter, normalizeConfig, PROVIDER_IDS }
export default DshAccountPool
