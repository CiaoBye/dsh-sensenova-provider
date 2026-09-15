function flattenText(message) {
  return (message.content ?? []).filter(block => block?.type === 'text').map(block => block.text ?? '').join('')
}

function flattenToolResult(blocks) {
  return (blocks ?? []).map((block) => {
    if (block?.type === 'text') return block.text ?? ''
    if (block?.type === 'tool-result') return flattenToolResult(block.content)
    return ''
  }).join('')
}

/** Repair broken historical tool calls before replaying them to SenseNova. */
export function toOpenAiMessages(options) {
  const systemParts = []
  if (typeof options.system === 'string' && options.system.length > 0) systemParts.push(options.system)
  for (const message of options.messages ?? []) {
    if (message.role !== 'system') continue
    const text = flattenText(message)
    if (text) systemParts.push(text)
  }

  const out = []
  if (systemParts.length > 0) out.push({ role: 'system', content: systemParts.join('\n\n') })
  const idRemap = new Map()
  let synthetic = 0

  for (const message of options.messages ?? []) {
    if (message.role === 'system') continue
    if (message.role === 'assistant') {
      const text = flattenText(message)
      const calls = []
      for (const block of message.content ?? []) {
        if (block?.type !== 'tool-call') continue
        const name = typeof block.name === 'string' ? block.name : ''
        if (!name) continue
        synthetic += 1
        const originalId = typeof block.id === 'string' ? block.id : ''
        const id = originalId || `sensenova-sanitized-${synthetic}`
        if (originalId) idRemap.set(originalId, id)
        calls.push({
          id,
          type: 'function',
          function: {
            name,
            arguments: typeof block.arguments === 'string' && block.arguments.length > 0 ? block.arguments : '{}',
          },
        })
      }
      if (!text && calls.length === 0) continue
      const entry = { role: 'assistant', content: text || null }
      if (calls.length > 0) entry.tool_calls = calls
      out.push(entry)
      continue
    }

    const text = flattenText(message)
    const results = (message.content ?? []).filter(block => block?.type === 'tool-result')
    if (text || results.length === 0) out.push({ role: 'user', content: text })
    for (const result of results) {
      const original = typeof result.toolCallId === 'string' ? result.toolCallId : ''
      const remapped = idRemap.get(original)
      if (!remapped) continue
      out.push({ role: 'tool', tool_call_id: remapped, content: flattenToolResult(result.content) || '(no output)' })
    }
  }
  return out
}

export function buildOpenAiBody(options) {
  const tools = (options.tools ?? []).map(tool => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }))
  return {
    model: options.model,
    messages: toOpenAiMessages(options),
    stream: true,
    stream_options: { include_usage: true },
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
    ...(Array.isArray(options.stop) && options.stop.length > 0 ? { stop: options.stop } : {}),
    ...(tools.length > 0 ? { tools } : {}),
    ...(options.reasoningEffort !== undefined ? { reasoning_effort: options.reasoningEffort } : {}),
  }
}
