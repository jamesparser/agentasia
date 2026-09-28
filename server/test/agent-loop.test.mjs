import assert from 'node:assert/strict'
import { runAgentTurn, WEB_SEARCH_TOOL, compactSearchForModel } from '../src/agent-loop.mjs'

const okEnv = { TAVILY_API_KEY: 'tvly-test' }
const fakeSearch = async ({ query }) => ({
  query, answer: `${query}: 84,511 USD`,
  results: [{ title: 'CoinGecko', url: 'https://cg/doge', content: 'live', score: 0.9, publishedDate: '2026-09-28' }],
  source: 'tavily', retrievedAt: '2026-09-28T12:00:00.000Z', requiresCitation: true,
})

const callsSeen = []
// 1) model asks to search, then answers -> citations + trace surfaced
const calls = []
const scripted = async (p) => {
  calls.push(p)
  callsSeen.push(p)
  if (calls.length === 1) {
    assert.equal(p.tools[0].function.name, 'web_search', 'search tool offered on round 1')
    return { choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null,
      tool_calls: [{ id: 'c1', type: 'function', function: { name: 'web_search', arguments: '{"query":"doge price"}' } }] } }] }
  }
  const toolMsg = p.messages.find((m) => m.role === 'tool')
  assert.ok(toolMsg, 'tool result was fed back to the model')
  assert.equal(toolMsg.tool_call_id, 'c1')
  assert.match(JSON.parse(toolMsg.content).answer, /84,511/)
  assert.equal(p.tool_choice, 'auto')
  return { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'DOGE は 84,511 USD です（CoinGecko）。' } }], usage: { total_tokens: 42 } }
}
const r1 = await runAgentTurn({ messages: [{ role: 'user', content: 'doge?' }], model: 'm', route: scripted, env: okEnv, search: fakeSearch })
assert.equal(r1.toolRounds, 1)
assert.equal(r1.citations.length, 1)
assert.equal(r1.citations[0].title, 'CoinGecko')
assert.equal(r1.citations[0].retrievedAt, '2026-09-28T12:00:00.000Z')
assert.equal(r1.usage.total_tokens, 42)
assert.match(r1.message.content, /CoinGecko/)

// 2) system addendum is injected first so the model knows the rule
assert.equal(calls[0].messages[0].role, 'system')
assert.match(calls[0].messages[0].content, /MUST come from a web_search result/)

// 3) no Tavily key -> no tools at all, plain answer (fails open to chat, not broken)
calls.length = 0
const plain = async (p) => { calls.push(p); return { choices: [{ finish_reason: 'stop', message: { content: 'hi' } }] } }
const r2 = await runAgentTurn({ messages: [{ role: 'user', content: 'hi' }], model: 'm', route: plain, env: {}, search: fakeSearch })
assert.equal(calls[0].tools, undefined, 'tools must not be advertised without a key')
assert.equal(r2.searchAvailable, false)
assert.deepEqual(r2.citations, [])

// 4) search error is reported to the model, which can then say it could not verify
calls.length = 0
const boom = async () => { throw new Error('rate_limited') }
const afterErr = async (p) => {
  const toolMsg = p.messages.find((m) => m.role === 'tool')
  if (toolMsg) assert.match(toolMsg.content, /rate_limited/)
  return { choices: [{ finish_reason: 'stop', message: { content: 'I could not verify that.' } }] }
}
calls.push(1)
const r3 = await runAgentTurn({
  messages: [{ role: 'user', content: 'x' }], model: 'm',
  route: async (p) => {
    if (!p.messages.some((m) => m.role === 'tool')) {
      return { choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'z', function: { name: 'web_search', arguments: '{}' } }] } }] }
    }
    return afterErr(p)
  }, env: okEnv, search: boom,
})
assert.equal(r3.searchTrace[0].ok, false)
assert.equal(r3.searchTrace[0].error, 'rate_limited')

// 5) runaway loop is bounded: always-asking model still terminates
let n = 0
const forever = async () => {
  n++
  return { choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: `t${n}`, function: { name: 'web_search', arguments: '{}' } }] } }] }
}
const r4 = await runAgentTurn({ messages: [{ role: 'user', content: 'x' }], model: 'm', route: forever, env: okEnv, search: fakeSearch })
assert.ok(n <= 4, `loop must be bounded, got ${n} calls`)
const lastRoute = null
assert.equal(typeof r4.message.content, 'string')

// 6) a tool we do not own is HANDED BACK to the client, never executed here,
//    and never an error - the user's own MCP holds their credentials.
const askedFor = []
const calls5 = []
const r5 = await runAgentTurn({
  messages: [{ role: 'user', content: 'x' }], model: 'm',
  route: async (p) => { calls5.push(p); return p.messages.some((m) => m.role === 'tool')
    ? { choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] }
    : { choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ id: 'u', function: { name: 'gmail_send', arguments: '{"to":"a@b.c"}' } }] } }] } },
  env: okEnv, search: fakeSearch,
  userTools: [{ type: 'function', function: { name: 'gmail_send', parameters: {} } }],
  onUserToolCall: (c) => askedFor.push(c),
})
assert.equal(r5.userToolCalls.length, 1)
assert.equal(r5.userToolCalls[0].name, 'gmail_send')
assert.deepEqual(r5.userToolCalls[0].arguments, { to: 'a@b.c' })
assert.equal(askedFor[0].name, 'gmail_send', 'caller notified so it can run it on its own connection')
assert.equal(r5.searchTrace[0].userTool, true)
assert.equal(r5.searchTrace[0].error, null, 'a user tool is not a failure')
// user tools are offered alongside web_search
assert.deepEqual(calls5[0].tools.map((t) => t.function.name), ['web_search', 'gmail_send'],
  'our search tool and the user\'s connector tool are offered together')

// 7) compaction: the model gets an answer + a few trimmed snippets, not the crawl
const fat = {
  answer: 'DOGE $0.0926', retrievedAt: 'now',
  results: Array.from({ length: 8 }, (_, i) => ({ title: 'T' + i, url: 'https://x/' + i, content: 'y'.repeat(2000), publishedDate: null })),
}
const slim = compactSearchForModel(fat)
assert.equal(slim.results.length, 3, 'only 3 results reach the model')
assert.ok(slim.results.every((r) => r.content.length <= 320), 'snippets truncated')
assert.equal(slim.results[0].url, 'https://x/0', 'URLs kept for citation')
assert.match(slim.instruction, /Cite one source title/)
assert.deepEqual(compactSearchForModel({ error: 'boom' }), { error: 'boom' })
// the full citation list is still returned to the UI, untouched
assert.equal(r1.citations.length, 1)
console.log('agent-loop (Tavily in the chat path) tests passed')
