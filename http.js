import { LlmError } from '@deepseek-ai/dsh-llm'

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRetryAfter(value) {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

function cooldown429(bodyText, connection, retryAfter) {
  let code
  try {
    const parsed = JSON.parse(bodyText)
    code = isRecord(parsed?.error) ? parsed.error.code : undefined
  } catch {}
  let floor = connection.cooldown429Ms
  if (code === 8 || code === '8') floor = Math.max(floor, 15_000)
  if (code === 429001 || code === '429001') floor = Math.max(floor, 60_000)
  return Math.min(Math.max(floor, retryAfter ?? 0, 1), connection.maxCooldown429Ms)
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function combinedAbort(hostSignal, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    const error = new Error(`connect/first-byte timeout after ${timeoutMs}ms`)
    error.name = 'TimeoutError'
    controller.abort(error)
  }, timeoutMs)
  const onAbort = () => controller.abort(hostSignal?.reason)
  if (hostSignal) {
    if (hostSignal.aborted) onAbort()
    else hostSignal.addEventListener('abort', onAbort, { once: true })
  }
  let disposed = false
  return {
    signal: controller.signal,
    headersReceived: () => clearTimeout(timer),
    dispose() {
      if (disposed) return
      disposed = true
      clearTimeout(timer)
      hostSignal?.removeEventListener('abort', onAbort)
    },
  }
}

export async function requestWithPool({ url, initFactory, hostSignal, connection, pool, fetchImpl, preferredId }) {
  const tried = new Set()
  let last429Delay
  let lastStatus

  while (tried.size < connection.keys.length) {
    const selected = await pool.acquire({ exclude: tried, preferredId })
    if (!selected) break
    tried.add(selected.slot.id)
    const abort = combinedAbort(hostSignal, connection.connectTimeoutMs)
    let response
    try {
      response = await fetchImpl(url, { ...initFactory(selected.key), signal: abort.signal })
      abort.headersReceived()
    } catch (error) {
      abort.dispose()
      if (hostSignal?.aborted) throw error
      if (error?.name === 'TimeoutError' || abort.signal.reason?.name === 'TimeoutError') {
        throw new LlmError(`llm-sensenova: ${errorMessage(abort.signal.reason ?? error)}`, 'TIMEOUT', { cause: error })
      }
      throw new LlmError(`llm-sensenova: transport error: ${errorMessage(error)}`, 'TRANSPORT', { cause: error })
    }

    if (response.ok) return { response, selected, release: () => abort.dispose() }
    lastStatus = response.status
    const bodyText = await response.text().catch(() => '')
    abort.dispose()
    if (response.status === 401) {
      pool.disable(selected.slot.id)
      continue
    }
    if (response.status === 429) {
      const delay = cooldown429(bodyText, connection, parseRetryAfter(response.headers.get('retry-after')))
      pool.cooldown(selected.slot.id, delay)
      last429Delay = delay
      continue
    }
    throw new LlmError(
      `llm-sensenova: SenseNova HTTP ${response.status}: ${bodyText.slice(0, 500)}`,
      response.status === 404 ? 'MODEL_NOT_FOUND' : 'PROVIDER_HTTP_ERROR',
      { status: response.status },
    )
  }

  if (lastStatus === 401) {
    throw new LlmError('llm-sensenova: all configured SenseNova keys were rejected with 401', 'INVALID_CREDENTIAL', { status: 401 })
  }
  const wait = pool.earliestCooldownMs()
  if (lastStatus === 429 || wait !== undefined) {
    throw new LlmError('llm-sensenova: all available SenseNova keys are cooling down after 429 responses', 'RATE_LIMIT', {
      status: 429,
      providerRetryAfterMs: Math.max(1, wait ?? last429Delay ?? connection.cooldown429Ms),
    })
  }
  throw new LlmError('llm-sensenova: no usable SenseNova API key is configured', 'MISSING_CREDENTIAL')
}
