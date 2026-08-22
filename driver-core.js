/**
 * Provider-neutral facts shared by the account pool and its provider drivers.
 *
 * This module intentionally has no DSH or pi-ai imports. It is the seam that
 * lets the state machine and provider-specific failure classification run in
 * plain Node tests.
 */

export const QUOTA_CODE = 'QUOTA'
export const INVALID_CREDENTIAL_CODE = 'INVALID_CREDENTIAL'
export const AUTH_CODE = 'AUTH'

export const PROVIDER_IDS = Object.freeze([
  'opencode-go',
  'opencode',
  'openrouter',
])

export const USAGE_KINDS = Object.freeze({
  WINDOWS: 'windows',
  CREDITS: 'credits',
  UNSUPPORTED: 'unsupported',
})

const QUOTA_CODES = new Set([
  QUOTA_CODE,
  'QUOTA_EXCEEDED',
  'INSUFFICIENT_CREDITS',
  'SPENDING_LIMIT',
  'BILLING_LIMIT',
])

const INVALID_CODES = new Set([
  INVALID_CREDENTIAL_CODE,
  AUTH_CODE,
  'UNAUTHORIZED',
  'AUTHENTICATION_ERROR',
])

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function textOf(value) {
  return typeof value === 'string' ? value : ''
}

/** Extract serializable failure facts from a DSH/pi-ai error or finish. */
export function failureFacts(error) {
  const source = error && typeof error === 'object' ? error : {}
  const response = source.response && typeof source.response === 'object' ? source.response : {}
  const nested = source.error && typeof source.error === 'object' ? source.error : {}
  const status = numberOrNull(source.status ?? source.statusCode ?? response.status)
  const code = textOf(source.code || source.type || nested.code || source.name)
  const message = textOf(source.message || nested.message || source.error || response.statusText)
  return { code, message, status }
}

function normalized(code, facts) {
  return {
    code,
    message: facts.message,
    ...(facts.status === null ? {} : { status: facts.status }),
  }
}

/** Generic classification for OpenCode Go and OpenCode Zen. */
export function classifyOpenCodeFailure(error) {
  const facts = failureFacts(error)
  const upperCode = facts.code.toUpperCase()
  if (facts.status === 401 || INVALID_CODES.has(upperCode)) {
    return normalized(INVALID_CREDENTIAL_CODE, facts)
  }
  if (QUOTA_CODES.has(upperCode) || /quota|credit|billing|spending limit|limit exceeded/i.test(facts.message)) {
    return normalized(QUOTA_CODE, facts)
  }
  return normalized(facts.code || 'UNKNOWN', facts)
}

/**
 * OpenRouter deliberately does not rotate a key for an ordinary 429. The
 * upstream provider router can recover from transient upstream throttling;
 * only account-level billing/credit failures rotate the account pool.
 */
export function classifyOpenRouterFailure(error) {
  const facts = failureFacts(error)
  const upperCode = facts.code.toUpperCase()
  if (facts.status === 401 || INVALID_CODES.has(upperCode)) {
    return normalized(INVALID_CREDENTIAL_CODE, facts)
  }
  if (facts.status === 402
      || QUOTA_CODES.has(upperCode)
      || /insufficient credits?|spending limit|billing limit|credit balance|payment required/i.test(facts.message)) {
    return normalized(QUOTA_CODE, facts)
  }
  return normalized(facts.code || 'UNKNOWN', facts)
}

export function isRotationFailure(failure) {
  return failure?.code === QUOTA_CODE
    || failure?.code === INVALID_CREDENTIAL_CODE
    || failure?.code === AUTH_CODE
}

export function isTransientFailure(failure) {
  return !isRotationFailure(failure)
}

/** Normalize a provider model id from an /models response. */
export function modelIdOf(value) {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  return typeof value.id === 'string' ? value.id.trim() : ''
}
