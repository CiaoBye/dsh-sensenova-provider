/**
 * Provider drivers for the unified DSH account pool.
 *
 * Driver objects contain provider-specific facts only. Pool state and stream
 * failover remain provider-neutral in index.js/pool.js.
 */

import { opencodeGoProvider } from '@earendil-works/pi-ai/providers/opencode-go'
import { opencodeProvider } from '@earendil-works/pi-ai/providers/opencode'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import {
  classifyOpenCodeFailure,
  classifyOpenRouterFailure,
  PROVIDER_IDS,
  USAGE_KINDS,
} from './driver-core.js'

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_USAGE_REFRESH_MS = 30000

function profileFor(driver, provider, route, resolveRetryPolicy) {
  if (provider.id !== route) provider.id = route
  return {
    provider: route,
    displayName: driver.displayName,
    streamIdleTimeoutMs: 300000,
    retryPolicy: resolveRetryPolicy(undefined, `dsh-account-pool.${route}.catalog.retryPolicy`),
    piProvider: provider,
    configuredMaxTokens: new Map(),
    modelCapabilities: new Map(),
  }
}

function driver({
  id,
  displayName,
  usageKind,
  defaultUsageBaseUrl,
  defaultModelsUrl,
  createProvider,
  classifyFailure,
  canPreemptByUsage,
  canAutoRevive,
}) {
  return Object.freeze({
    id,
    route: id,
    displayName,
    usageKind,
    defaultUsageBaseUrl,
    defaultModelsUrl,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    defaultUsageRefreshMs: DEFAULT_USAGE_REFRESH_MS,
    canPreemptByUsage,
    canAutoRevive,
    createProvider,
    classifyFailure,
    buildProfile(provider, resolveRetryPolicy) {
      return profileFor(this, provider, this.route, resolveRetryPolicy)
    },
  })
}

export const PROVIDER_DRIVERS = Object.freeze({
  'opencode-go': driver({
    id: 'opencode-go',
    displayName: 'OpenCode Go',
    usageKind: USAGE_KINDS.WINDOWS,
    defaultUsageBaseUrl: 'https://opencode.ai/zen/go/v1/usage',
    defaultModelsUrl: 'https://opencode.ai/zen/go/v1/models',
    createProvider: opencodeGoProvider,
    classifyFailure: classifyOpenCodeFailure,
    canPreemptByUsage: true,
    canAutoRevive: true,
  }),
  opencode: driver({
    id: 'opencode',
    displayName: 'OpenCode Zen',
    usageKind: USAGE_KINDS.UNSUPPORTED,
    defaultUsageBaseUrl: null,
    defaultModelsUrl: 'https://opencode.ai/zen/v1/models',
    createProvider: opencodeProvider,
    classifyFailure: classifyOpenCodeFailure,
    canPreemptByUsage: false,
    canAutoRevive: false,
  }),
  openrouter: driver({
    id: 'openrouter',
    displayName: 'OpenRouter',
    usageKind: USAGE_KINDS.CREDITS,
    defaultUsageBaseUrl: 'https://openrouter.ai/api/v1/key',
    defaultModelsUrl: 'https://openrouter.ai/api/v1/models',
    createProvider: openrouterProvider,
    classifyFailure: classifyOpenRouterFailure,
    canPreemptByUsage: true,
    canAutoRevive: true,
  }),
})

export function getProviderDriver(id) {
  return PROVIDER_DRIVERS[id] ?? null
}

export function assertProviderId(id) {
  if (!PROVIDER_IDS.includes(id)) throw new Error(`unsupported provider "${id}"`)
  return id
}

export { PROVIDER_IDS, USAGE_KINDS }
