import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOpenAiSse } from '../openai-sse.js'
import { toOpenAiMessages } from '../openai-history.js'

function sse(lines) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(lines.join('\n') + '\n'))
      controller.close()
    },
  })
}

async function collect(body) {
  const out = []
  for await (const chunk of parseOpenAiSse(body, { idleTimeoutMs: 1000 })) out.push(chunk)
  return out
}

test('preserves tool id/name when later SenseNova chunks send empty fields', async () => {
  const chunks = await collect(sse([
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","function":{"name":"read_file","arguments":""}}]},"finish_reason":null}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"","function":{"name":"","arguments":"{\\"path\\":\\"a\\"}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}',
    'data: [DONE]',
  ]))
  const end = chunks.find(chunk => chunk.type === 'block-end' && chunk.block.type === 'tool-call')
  assert.equal(end.block.id, 'call_abc')
  assert.equal(end.block.name, 'read_file')
  assert.equal(end.block.arguments, '{"path":"a"}')
  assert.equal(chunks.at(-2).type, 'usage')
  assert.equal(chunks.at(-1).type, 'finish')
  assert.equal(chunks.at(-1).reason.kind, 'tool-calls')
})

test('buffers trailing usage and never emits after finish', async () => {
  const chunks = await collect(sse([
    'data: {"choices":[{"delta":{"content":"hi"},"finish_reason":"stop"}]}',
    'data: {"choices":[],"usage":{"prompt_tokens":4,"completion_tokens":1,"total_tokens":5}}',
    'data: [DONE]',
  ]))
  const finishIndex = chunks.findIndex(chunk => chunk.type === 'finish')
  const usageIndex = chunks.findIndex(chunk => chunk.type === 'usage')
  assert.ok(usageIndex >= 0 && usageIndex < finishIndex)
  assert.equal(finishIndex, chunks.length - 1)
})

test('sanitizes broken tool history', () => {
  const messages = toOpenAiMessages({
    messages: [
      { role: 'assistant', content: [
        { type: 'tool-call', id: '', name: 'read_file', arguments: '' },
        { type: 'tool-call', id: 'bad', name: '', arguments: '{"x":1}' },
      ] },
      { role: 'user', content: [
        { type: 'tool-result', toolCallId: 'bad', content: [{ type: 'text', text: 'orphan' }] },
      ] },
    ],
  })
  assert.equal(messages.length, 1)
  assert.equal(messages[0].role, 'assistant')
  assert.equal(messages[0].tool_calls[0].function.name, 'read_file')
  assert.equal(messages[0].tool_calls[0].function.arguments, '{}')
})
