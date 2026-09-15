import { createStreamState, processStreamEvent, terminalChunks } from './sse-state.js'

/** DSH >=0.1.6 invariant: usage before finish; never emit after finish. */
export async function* parseOpenAiSse(body, { signal, idleTimeoutMs = 60_000 } = {}) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const state = createStreamState()
  let buffer = ''
  let doneMarker = false

  const read = async () => {
    let timer
    try {
      return await Promise.race([
        reader.read(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error(`SenseNova stream idle for ${idleTimeoutMs}ms`)
            error.name = 'TimeoutError'
            reject(error)
          }, idleTimeoutMs)
        }),
      ])
    } finally { if (timer) clearTimeout(timer) }
  }

  const consume = (line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(':')) return { chunks: [], done: false }
    const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
    if (!payload) return { chunks: [], done: false }
    if (payload === '[DONE]') return { chunks: [], done: true }
    try { return { chunks: processStreamEvent(JSON.parse(payload), state), done: false } }
    catch (error) {
      if (error instanceof SyntaxError) return { chunks: [], done: false }
      throw error
    }
  }

  try {
    while (!doneMarker) {
      if (signal?.aborted) throw signal.reason ?? new Error('aborted')
      const { done, value } = await read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const result = consume(line)
        for (const chunk of result.chunks) yield chunk
        if (result.done) { doneMarker = true; break }
      }
    }
    if (!doneMarker && buffer.trim()) {
      const result = consume(buffer)
      for (const chunk of result.chunks) yield chunk
    }
    for (const chunk of terminalChunks(state)) yield chunk
  } finally {
    try { await reader.cancel() } catch {}
    try { reader.releaseLock() } catch {}
  }
}
