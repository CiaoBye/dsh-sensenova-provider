import { LlmAdapter, LlmError, attributionHeaders, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { buildOpenAiBody } from './openai-history.js'
import { parseOpenAiSse } from './openai-sse.js'
import { displayName, parseCatalogModel } from './catalog.js'
import { requestWithPool } from './http.js'
import { modelIsVisible, preferredKeyForModel } from './routing.js'

const MODELS_TIMEOUT_MS = 10_000
function errorMessage(error) { return error instanceof Error ? error.message : String(error) }

export class SenseNovaAdapter extends LlmAdapter {
  constructor({ options, pool, fetchImpl = fetch }) {
    super()
    this.options = options
    this.pool = pool
    this.fetchImpl = fetchImpl
    this.catalog = new Map()
  }

  providerInfo(provider) { return { id: provider, name: 'SenseNova' } }

  providerRetryPolicy() {
    const connection = this.options()
    return resolveRetryPolicy({
      mode: 'normal', maxRetries: 5, backoff: { maxDelayMs: connection.maxCooldown429Ms },
    }, 'llm-sensenova.retryPolicy')
  }

  _request(url, initFactory, hostSignal, preferredId) {
    return requestWithPool({
      url, initFactory, hostSignal, preferredId,
      connection: this.options(), pool: this.pool, fetchImpl: this.fetchImpl,
    })
  }

  async listAllModels(provider = 'sensenova') {
    const connection = this.options()
    const { response, release } = await this._request(
      `${connection.apiBase}/models`,
      key => ({ headers: { accept: 'application/json', authorization: `Bearer ${key}`, ...attributionHeaders() } }),
      AbortSignal.timeout(MODELS_TIMEOUT_MS),
      connection.activeKey || undefined,
    )
    let payload
    try { payload = await response.json() } finally { release() }
    const next = new Map()
    for (const raw of Array.isArray(payload?.data) ? payload.data : []) {
      const entry = parseCatalogModel(raw)
      if (entry) next.set(entry.id, entry)
    }
    this.catalog = next
    return [...next.values()].map(entry => ({
      provider, id: entry.id, name: entry.name, inputModalities: entry.inputModalities,
      contextWindow: entry.contextWindow, maxTokens: entry.maxTokens,
    }))
  }

  async listModels(provider) {
    const connection = this.options()
    const all = await this.listAllModels(provider)
    return all.filter(entry => modelIsVisible(connection, entry.id)).map(entry => ({
      provider, id: entry.id, name: entry.name, inputModalities: entry.inputModalities,
    }))
  }

  async resolveModel(provider, model) {
    const connection = this.options()
    const entry = this.catalog.get(model)
    return {
      provider, id: model,
      name: entry?.name ?? displayName(model),
      inputModalities: entry?.inputModalities ?? ['text'],
      context: { contextWindow: entry?.contextWindow ?? connection.defaultContextWindow },
      ...(entry?.maxTokens ? { defaultMaxTokens: entry.maxTokens } : {}),
      ...(entry?.reasoning ? { reasoning: entry.reasoning } : {}),
    }
  }

  async *stream(options) {
    const connection = this.options()
    const body = JSON.stringify(buildOpenAiBody(options))
    const preferredId = preferredKeyForModel(connection, options.model)
    const { response, release } = await this._request(
      `${connection.apiBase}/chat/completions`,
      key => ({
        method: 'POST', body,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, ...attributionHeaders() },
      }),
      options.signal,
      preferredId,
    )
    if (!response.body) {
      release()
      throw new LlmError('llm-sensenova: response body is missing', 'PROVIDER_PROTOCOL_ERROR')
    }
    try {
      yield* parseOpenAiSse(response.body, { signal: options.signal, idleTimeoutMs: connection.streamIdleTimeoutMs })
    } catch (error) {
      if (options.signal?.aborted) throw error
      if (error?.code === 'PROVIDER_PROTOCOL_ERROR' || error?.code === 'EMPTY_RESPONSE') {
        throw new LlmError(`llm-sensenova: ${errorMessage(error)}`, error.code, { cause: error })
      }
      if (error?.name === 'TimeoutError') {
        throw new LlmError(`llm-sensenova: ${errorMessage(error)}`, 'TIMEOUT', { cause: error })
      }
      throw new LlmError(`llm-sensenova: stream error: ${errorMessage(error)}`, 'TRANSPORT', { cause: error })
    } finally { release() }
  }
}
