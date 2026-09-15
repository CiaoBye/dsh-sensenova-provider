function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function str(value) { return typeof value === 'string' ? value : '' }
function num(value) { return typeof value === 'number' && Number.isFinite(value) ? value : 0 }

function mapUsage(raw) {
  const usage = isRecord(raw) ? raw : {}
  const prompt = num(usage.prompt_tokens)
  const completion = num(usage.completion_tokens)
  const total = num(usage.total_tokens)
  const promptDetails = isRecord(usage.prompt_tokens_details) ? usage.prompt_tokens_details : {}
  const completionDetails = isRecord(usage.completion_tokens_details) ? usage.completion_tokens_details : {}
  const cacheRead = num(promptDetails.cached_tokens)
  const reasoning = num(completionDetails.reasoning_tokens)
  return {
    inputTokens: Math.max(0, prompt - cacheRead), outputTokens: completion,
    totalTokens: total > 0 ? total : prompt + completion,
    ...(cacheRead > 0 ? { cacheReadTokens: cacheRead } : {}),
    ...(reasoning > 0 ? { reasoningTokens: reasoning } : {}),
  }
}

function finishReason(reason) {
  if (reason === 'tool_calls' || reason === 'function_call') return { kind: 'tool-calls' }
  if (reason === 'length') return { kind: 'max-tokens' }
  return { kind: 'stop' }
}

export function createStreamState() {
  return {
    nextIndex: 0, text: undefined, reasoning: undefined,
    toolsByProtocolIndex: new Map(), toolsById: new Map(), toolsByName: new Map(),
    tools: new Map(), lastToolIndex: undefined,
    pendingUsage: undefined, pendingFinish: undefined, sawOutput: false,
  }
}

function closeText(s) {
  if (!s.text) return []
  const block = s.text
  s.text = undefined
  return [{ type: 'block-end', index: block.index, block: { type: 'text', text: block.value } }]
}

function closeReasoning(s) {
  if (!s.reasoning) return []
  const block = s.reasoning
  s.reasoning = undefined
  return [{ type: 'block-end', index: block.index, block: { type: 'reasoning', text: block.value } }]
}

function closeTools(s) {
  const out = []
  for (const [index, tool] of [...s.tools.entries()].sort((a, b) => a[0] - b[0])) {
    if (!tool.started) continue
    if (!tool.name) {
      const error = new Error(`SenseNova emitted an incomplete tool call at stream index ${index}: missing function.name`)
      error.code = 'PROVIDER_PROTOCOL_ERROR'
      throw error
    }
    out.push({
      type: 'block-end', index,
      block: { type: 'tool-call', id: tool.id || `sensenova-tool-${index}`, name: tool.name, arguments: tool.args || '{}' },
    })
  }
  s.tools.clear(); s.toolsByProtocolIndex.clear(); s.toolsById.clear(); s.toolsByName.clear()
  s.lastToolIndex = undefined
  return out
}

function ensureTool(s, raw) {
  const protocolIndex = Number.isInteger(raw.index) ? raw.index : undefined
  const id = str(raw.id)
  const fn = isRecord(raw.function) ? raw.function : {}
  const name = str(fn.name)
  let index
  if (protocolIndex !== undefined) index = s.toolsByProtocolIndex.get(protocolIndex)
  if (index === undefined && id) index = s.toolsById.get(id)
  if (index === undefined && name) index = s.toolsByName.get(name)
  if (index === undefined && protocolIndex === undefined && !id && !name) index = s.lastToolIndex
  if (index === undefined) {
    index = s.nextIndex++
    s.tools.set(index, { id: '', name: '', args: '', started: false, bufferedArgs: '' })
  }
  const tool = s.tools.get(index)
  if (protocolIndex !== undefined) s.toolsByProtocolIndex.set(protocolIndex, index)
  if (id) { tool.id = id; s.toolsById.set(id, index) }
  if (name) { tool.name = name; s.toolsByName.set(name, index) }
  s.lastToolIndex = index
  return { tool, index, fn }
}

export function processStreamEvent(event, s) {
  if (!isRecord(event)) return []
  if (isRecord(event.usage)) s.pendingUsage = mapUsage(event.usage)
  const out = []
  for (const choice of Array.isArray(event.choices) ? event.choices : []) {
    if (!isRecord(choice)) continue
    const delta = isRecord(choice.delta) ? choice.delta : {}
    const reasoning = str(delta.reasoning_content) || str(delta.reasoning)
    const content = str(delta.content)

    if (reasoning) {
      out.push(...closeText(s))
      if (!s.reasoning) {
        s.reasoning = { index: s.nextIndex++, value: '' }
        out.push({ type: 'block-start', index: s.reasoning.index, blockType: 'reasoning' })
      }
      s.reasoning.value += reasoning; s.sawOutput = true
      out.push({ type: 'reasoning-delta', index: s.reasoning.index, text: reasoning })
    }
    if (content) {
      out.push(...closeReasoning(s))
      if (!s.text) {
        s.text = { index: s.nextIndex++, value: '' }
        out.push({ type: 'block-start', index: s.text.index, blockType: 'text' })
      }
      s.text.value += content; s.sawOutput = true
      out.push({ type: 'text-delta', index: s.text.index, text: content })
    }

    for (const raw of Array.isArray(delta.tool_calls) ? delta.tool_calls.filter(isRecord) : []) {
      out.push(...closeText(s), ...closeReasoning(s))
      const { tool, index, fn } = ensureTool(s, raw)
      const argsDelta = str(fn.arguments)
      if (!tool.started && (tool.id || tool.name)) {
        tool.started = true; s.sawOutput = true
        out.push({ type: 'block-start', index, blockType: 'tool-call' })
        if (tool.bufferedArgs) {
          tool.args += tool.bufferedArgs
          out.push({
            type: 'tool-call-delta', index, id: tool.id || `sensenova-tool-${index}`,
            ...(tool.name ? { name: tool.name } : {}), argumentsDelta: tool.bufferedArgs,
          })
          tool.bufferedArgs = ''
        }
      }
      if (!tool.started) { tool.bufferedArgs += argsDelta; continue }
      tool.args += argsDelta
      out.push({
        type: 'tool-call-delta', index, id: tool.id || `sensenova-tool-${index}`,
        ...(tool.name ? { name: tool.name } : {}), argumentsDelta: argsDelta,
      })
    }
    if (typeof choice.finish_reason === 'string' && choice.finish_reason.length > 0) {
      s.pendingFinish = finishReason(choice.finish_reason)
    }
  }
  return out
}

export function terminalChunks(s) {
  const out = [...closeText(s), ...closeReasoning(s), ...closeTools(s)]
  if (s.pendingUsage) out.push({ type: 'usage', usage: s.pendingUsage })
  if (!s.sawOutput && !s.pendingFinish) {
    const error = new Error('SenseNova returned an empty streaming response')
    error.code = 'EMPTY_RESPONSE'
    throw error
  }
  out.push({ type: 'finish', reason: s.pendingFinish ?? { kind: 'stop' } })
  return out
}
