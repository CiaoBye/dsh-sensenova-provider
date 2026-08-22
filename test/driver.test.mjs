import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyOpenCodeFailure,
  classifyOpenRouterFailure,
  failureFacts,
  isRotationFailure,
} from '../driver-core.js'

test('OpenCode failure classification rotates quota and credentials', () => {
  assert.equal(classifyOpenCodeFailure({ code: 'QUOTA' }).code, 'QUOTA')
  assert.equal(classifyOpenCodeFailure({ code: 'AUTH', message: 'bad token' }).code, 'INVALID_CREDENTIAL')
  assert.equal(classifyOpenCodeFailure({ status: 401, message: 'unauthorized' }).code, 'INVALID_CREDENTIAL')
  assert.equal(classifyOpenCodeFailure({ code: 'RATE_LIMIT', message: 'try later' }).code, 'RATE_LIMIT')
})

test('OpenRouter does not rotate for ordinary 429 but does for account billing failures', () => {
  assert.equal(classifyOpenRouterFailure({ status: 429, message: 'upstream overloaded' }).code, 'UNKNOWN')
  assert.equal(classifyOpenRouterFailure({ status: 402, message: 'payment required' }).code, 'QUOTA')
  assert.equal(classifyOpenRouterFailure({ message: 'insufficient credits' }).code, 'QUOTA')
  assert.equal(classifyOpenRouterFailure({ status: 401, message: 'invalid key' }).code, 'INVALID_CREDENTIAL')
})

test('failure facts preserve status and never carry arbitrary error objects', () => {
  assert.deepEqual(failureFacts({ code: 'HTTP_ERROR', message: 'bad', response: { status: 503 } }), {
    code: 'HTTP_ERROR', message: 'bad', status: 503,
  })
  assert.deepEqual(failureFacts({ error: { code: 'PAYMENT_REQUIRED', message: 'credit balance' }, status: 402 }), {
    code: 'PAYMENT_REQUIRED', message: 'credit balance', status: 402,
  })
  assert.deepEqual(failureFacts('broken'), { code: '', message: '', status: null })
  assert.equal(isRotationFailure({ code: 'QUOTA' }), true)
  assert.equal(isRotationFailure({ code: 'RATE_LIMIT' }), false)
})
