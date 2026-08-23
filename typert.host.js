// Hand-written Typert host manifest for dsh-account-pool.
// Every parameter and result intentionally uses a strict codec: the DSH
// typert-loader rejects src-json result codecs during plugin activation.

import { z } from 'zod'

const windowSchema = z.object({
  status: z.string().nullable(),
  percent: z.number().nullable(),
  resetsAt: z.string().nullable(),
})

const creditsSchema = z.object({
  usage: z.number().nullable(),
  usageDaily: z.number().nullable(),
  usageWeekly: z.number().nullable(),
  usageMonthly: z.number().nullable(),
  limit: z.number().nullable(),
  limitRemaining: z.number().nullable(),
  limitReset: z.string().nullable(),
  expiresAt: z.string().nullable(),
})

const usageSchema = z.object({
  kind: z.string(),
  preemptPercent: z.number().nullable(),
  revive: z.boolean(),
  rolling: windowSchema.nullable(),
  weekly: windowSchema.nullable(),
  monthly: windowSchema.nullable(),
  credits: creditsSchema.nullable(),
})

const lastFailureSchema = z.object({
  code: z.string(),
  message: z.string(),
  at: z.string(),
})

const keyStatusSchema = z.object({
  id: z.string(),
  label: z.string(),
  apiKeyEnv: z.string(),
  state: z.string(),
  active: z.boolean(),
  usage: usageSchema.nullable(),
  usageError: z.string().nullable(),
  fetchedAt: z.string().nullable(),
  credentialSet: z.boolean(),
  lastFailure: lastFailureSchema.nullable(),
})

const modelSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  providerGroup: z.string(),
  providerLabel: z.string(),
  input: z.array(z.string()),
  reasoning: z.boolean(),
  contextWindow: z.number().nullable(),
  maxTokens: z.number().nullable(),
  cost: z.object({
    input: z.number(),
    output: z.number(),
  }).nullable(),
  tags: z.array(z.string()),
})

const providerStatusSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  route: z.string(),
  enabled: z.boolean(),
  takeover: z.string(),
  takeoverHint: z.string().nullable(),
  usageKind: z.string(),
  canPreemptByUsage: z.boolean(),
  canAutoRevive: z.boolean(),
  usageRefreshMs: z.number(),
  catalogRefreshMs: z.number(),
  catalogError: z.string().nullable(),
  preemptAtPercent: z.number(),
  switchAfterConsecutiveFailures: z.number(),
  modelMode: z.string(),
  configuredModels: z.array(z.string()),
  availableModels: z.array(modelSummarySchema),
  activeId: z.string().nullable(),
  lastSwitch: z.object({
    from: z.string().nullable(),
    to: z.string().nullable(),
    reason: z.string(),
    at: z.string(),
  }).nullable(),
  keys: z.array(keyStatusSchema),
})

const keyInputSchema = z.object({
  id: z.string(),
  label: z.string(),
  apiKeyEnv: z.string(),
})

const strict = (typeSymbol, schema) => ({ mode: 'strict', typeSymbol, schema })

const invocation = (method, parameters, result) => ({
  id: `dsh-account-pool#accountPool/${method}`,
  service: 'accountPool',
  namespace: 'accountPool',
  method,
  invocation: { kind: 'direct' },
  parameters: parameters.map(({ name, wire, typeSymbol, schema }) => ({
    name,
    wire,
    source: 'json',
    codec: strict(typeSymbol, schema),
  })),
  result,
})

const providerId = { name: 'provider', wire: 'provider', typeSymbol: 'string', schema: z.string() }
const keyId = { name: 'id', wire: 'id', typeSymbol: 'string', schema: z.string() }

export const TYPERT = {
  package: 'dsh-account-pool',
  face: 'host',
  schemas: [],
  invocations: [
    invocation('status', [], strict('dsh-account-pool#PoolStatus', z.object({
      version: z.number(),
      providers: z.array(providerStatusSchema),
    }))),
    invocation('setActive', [providerId, keyId], strict('boolean', z.boolean())),
    invocation('setDisabled', [
      providerId,
      keyId,
      { name: 'on', wire: 'on', typeSymbol: 'boolean', schema: z.boolean() },
    ], strict('boolean', z.boolean())),
    invocation('clearInvalid', [providerId, keyId], strict('boolean', z.boolean())),
    invocation('putKeys', [
      providerId,
      { name: 'keys', wire: 'keys', typeSymbol: 'dsh-account-pool#KeyInputList', schema: z.array(keyInputSchema) },
    ], strict('boolean', z.boolean())),
    invocation('putKeySecret', [
      providerId,
      keyId,
      { name: 'secret', wire: 'secret', typeSymbol: 'string', schema: z.string() },
    ], strict('boolean', z.boolean())),
    invocation('putConfig', [
      providerId,
      {
        name: 'config',
        wire: 'config',
        typeSymbol: 'dsh-account-pool#ProviderConfigPatch',
        schema: z.object({
          enabled: z.boolean().optional(),
          takeover: z.boolean().optional(),
          preemptAtPercent: z.number().optional(),
          switchAfterConsecutiveFailures: z.number().optional(),
          modelMode: z.string().optional(),
          models: z.array(z.string()).optional(),
          usageBaseUrl: z.string().optional(),
          modelsBaseUrl: z.string().optional(),
          usageRefreshMs: z.number().optional(),
          catalogRefreshMs: z.number().optional(),
          timeoutMs: z.number().optional(),
        }),
      },
    ], strict('boolean', z.boolean())),
    invocation('takeOverState', [providerId], strict('string', z.string())),
    invocation('refreshModels', [providerId], strict('boolean', z.boolean())),
  ],
  model: { services: [], events: [], objects: [] },
}
