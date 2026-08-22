/**
 * Usage gateways for the account-pool drivers.
 *
 * Go exposes rolling/weekly/monthly windows. OpenRouter exposes account
 * spending and remaining-limit fields. Zen currently has no public usage
 * endpoint, so its driver reports usage as unsupported instead of fabricating
 * quota numbers.
 */

import { USAGE_KINDS } from './driver-core.js'

/** Coded failure for one usage query; `code` is a stable machine key. */
export class UsageError extends Error {
  constructor(code, message, options = {}) {
    super(message, options)
    this.name = 'UsageError'
    this.code = code
  }
}

function finite(value) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function pickWindow(value) {
  if (!value || typeof value !== 'object') return null
  const percent = finite(value.percent)
  return {
    status: typeof value.status === 'string' ? value.status : null,
    percent: percent === null ? null : Math.max(0, Math.min(100, percent)),
    resetsAt: typeof value.resetsAt === 'string' ? value.resetsAt : null,
  }
}

function numberField(value) {
  return finite(value)
}

async function requestJson({ url, apiKey, timeoutMs = 15000, fetchImpl }) {
  const impl = fetchImpl ?? globalThis.fetch
  if (typeof impl !== 'function') throw new UsageError('network', 'fetch is not available')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await impl(url, {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
  } catch (error) {
    throw new UsageError('network', `usage request failed: ${url}`, { cause: error })
  } finally {
    clearTimeout(timer)
  }
  if (response.status === 401) {
    throw new UsageError('unauthorized', 'usage endpoint rejected the key (401)')
  }
  if (!response.ok) {
    throw new UsageError(`http-${response.status}`, `usage endpoint answered HTTP ${response.status}`)
  }
  try {
    return await response.json()
  } catch (error) {
    throw new UsageError('bad-json', 'usage endpoint answered with non-JSON', { cause: error })
  }
}

/**
 * Query the OpenCode Go usage endpoint once for one key.
 * @returns {Promise<{kind: 'windows', rolling: object|null, weekly: object|null, monthly: object|null, credits: null}>}
 */
export async function fetchUsage({ baseUrl, apiKey, timeoutMs = 15000, fetchImpl }) {
  const body = await requestJson({ url: baseUrl, apiKey, timeoutMs, fetchImpl })
  const usage = body && typeof body === 'object' && body.usage ? body.usage : body
  const rolling = pickWindow(usage && usage.rolling)
  const weekly = pickWindow(usage && usage.weekly)
  const monthly = pickWindow(usage && usage.monthly)
  return {
    kind: USAGE_KINDS.WINDOWS,
    preemptPercent: rolling?.percent ?? null,
    revive: rolling?.status === 'ok' && typeof rolling.percent === 'number' && rolling.percent < 98,
    rolling,
    weekly,
    monthly,
    credits: null,
  }
}

/** Query OpenRouter's current-key endpoint. */
export async function fetchOpenRouterUsage({ baseUrl, apiKey, timeoutMs = 15000, fetchImpl }) {
  const body = await requestJson({ url: baseUrl, apiKey, timeoutMs, fetchImpl })
  const data = body && typeof body === 'object' && body.data ? body.data : body
  const credits = data && typeof data === 'object' ? {
    usage: numberField(data.usage),
    usageDaily: numberField(data.usage_daily),
    usageWeekly: numberField(data.usage_weekly),
    usageMonthly: numberField(data.usage_monthly),
    limit: numberField(data.limit),
    limitRemaining: numberField(data.limit_remaining),
    limitReset: typeof data.limit_reset === 'string' ? data.limit_reset : null,
    expiresAt: typeof data.expires_at === 'string' ? data.expires_at : null,
  } : {
    usage: null,
    usageDaily: null,
    usageWeekly: null,
    usageMonthly: null,
    limit: null,
    limitRemaining: null,
    limitReset: null,
    expiresAt: null,
  }
  const preemptPercent = credits.limit && credits.limit > 0 && credits.limitRemaining !== null
    ? Math.max(0, Math.min(100, ((credits.limit - credits.limitRemaining) / credits.limit) * 100))
    : null
  return {
    kind: USAGE_KINDS.CREDITS,
    preemptPercent,
    revive: credits.limitRemaining !== null && credits.limitRemaining > 0,
    rolling: null,
    weekly: null,
    monthly: null,
    credits,
  }
}

/** Small TTL cache with in-flight dedupe. */
export class UsageCache {
  constructor({ ttlMs = 15000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs
    this.now = now
    this.entries = new Map()
    this.inflight = new Map()
  }

  async get(key, fetcher) {
    const hit = this.entries.get(key)
    if (hit && this.now() - hit.at < this.ttlMs) return hit.value
    const inflight = this.inflight.get(key)
    if (inflight) return inflight
    const promise = Promise.resolve()
      .then(fetcher)
      .then(value => {
        this.entries.set(key, { value, at: this.now() })
        return value
      })
      .finally(() => { this.inflight.delete(key) })
    this.inflight.set(key, promise)
    return promise
  }

  invalidate(key) {
    this.entries.delete(key)
  }
}
