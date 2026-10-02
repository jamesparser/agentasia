import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = await mkdtemp(join(tmpdir(), 'sched-'))
process.env.SCHEDULES_FILE = join(dir, 'schedules.json')
process.env.SCHEDULE_RUNS_FILE = join(dir, 'runs.json')
const { createSchedule, listSchedules, updateSchedule, deleteSchedule, computeNextRun } = await import('../src/schedules.mjs')
const { processDueSchedules, listScheduleRuns } = await import('../src/schedule-worker.mjs')
const { executeScheduledTask } = await import('../src/schedule-runner.mjs')

const PP = 420 // Phnom Penh, minutes east of UTC

test('computeNextRun: daily keeps the local wall clock hour', () => {
  const spec = { frequency: 'daily', timeOfDay: '09:00', tzOffsetMinutes: PP }
  assert.equal(computeNextRun(spec, new Date('2026-10-02T01:00:00Z')).toISOString(), '2026-10-02T02:00:00.000Z')
  assert.equal(computeNextRun(spec, new Date('2026-10-02T02:30:00Z')).toISOString(), '2026-10-03T02:00:00.000Z')
})

test('computeNextRun: weekly, monthly and once', () => {
  const after = new Date('2026-10-02T00:00:00Z') // a Friday
  const wk = computeNextRun({ frequency: 'weekly', weekday: 1, timeOfDay: '07:30', tzOffsetMinutes: 0 }, after)
  assert.equal(wk.toISOString(), '2026-10-05T07:30:00.000Z')
  const mo = computeNextRun({ frequency: 'monthly', dayOfMonth: 15, timeOfDay: '00:00', tzOffsetMinutes: 0 }, after)
  assert.equal(mo.toISOString(), '2026-10-15T00:00:00.000Z')
  assert.equal(computeNextRun({ frequency: 'once', runAt: '2020-01-01T00:00:00Z' }, after), null)
  assert.equal(computeNextRun({ frequency: 'once', runAt: '2026-11-01T00:00:00Z' }, after).toISOString(), '2026-11-01T00:00:00.000Z')
})

test('validation rejects cron, bad times and oversize prompts', async () => {
  const base = { title: 't', prompt: 'p', frequency: 'daily', timeOfDay: '09:00', tzOffsetMinutes: 0 }
  await assert.rejects(createSchedule({ ...base, frequency: 'cron' }, 'u'), /invalid_frequency/)
  await assert.rejects(createSchedule({ ...base, timeOfDay: '25:00' }, 'u'), /invalid_time_of_day/)
  await assert.rejects(createSchedule({ ...base, prompt: 'x'.repeat(2001) }, 'u'), /prompt_required_max_2000/)
  await assert.rejects(createSchedule({ ...base, frequency: 'weekly' }, 'u'), /weekday_required/)
  await assert.rejects(createSchedule(base, ''), /owner_required/)
})

test('tasks are private to their owner and capped per user', async () => {
  const mk = { title: 'Brief', prompt: 'Summarise the news', frequency: 'daily', timeOfDay: '08:00', tzOffsetMinutes: PP }
  const a = await createSchedule(mk, 'alice')
  assert.equal((await listSchedules('alice')).length, 1)
  assert.deepEqual(await listSchedules('bob'), [])
  assert.equal(a.ownerUid, undefined, 'owner id is never echoed back')
  await assert.rejects(updateSchedule('bob', a.id, { status: 'paused' }), /schedule_not_found/)
  await assert.rejects(deleteSchedule('bob', a.id), /schedule_not_found/)
  const paused = await updateSchedule('alice', a.id, { status: 'paused' })
  assert.equal(paused.status, 'paused')
  for (let i = 0; i < 5; i += 1) await createSchedule(mk, 'carol')
  await assert.rejects(createSchedule(mk, 'carol'), /schedule_limit_reached/)
  await deleteSchedule('alice', a.id)
  assert.equal((await listSchedules('alice')).length, 0)
})

test('worker runs due tasks once, advances the clock, and records runs per owner', async () => {
  const t = await createSchedule({ title: 'Due', prompt: 'hi', frequency: 'daily', timeOfDay: '00:00', tzOffsetMinutes: 0 }, 'dora')
  const seen = []
  const execute = async (task) => { seen.push(task.ownerUid); return { status: 'completed', text: 'ok' } }
  const later = new Date(Date.parse(t.nextRunAt) + 1000)
  const first = await processDueSchedules({ now: later, execute })
  assert.equal(first.filter((r) => r.scheduledTaskId === t.id).length, 1)
  const again = await processDueSchedules({ now: later, execute })
  assert.equal(again.filter((r) => r.scheduledTaskId === t.id).length, 0, 'not picked up twice')
  const [after] = await listSchedules('dora')
  assert.ok(Date.parse(after.nextRunAt) > later.getTime())
  assert.equal((await listScheduleRuns('dora', t.id)).length, 1)
  assert.equal((await listScheduleRuns('eve', t.id)).length, 0)
  assert.ok(seen.includes('dora'))
})

test('runner: plan model and token ceiling, allowance and budget skips, failures contained', async () => {
  const calls = []
  const deps = (over = {}) => ({
    resolvePlan: async () => ({ plan: 'free', model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', maxTokens: 1500 }),
    assertWithinAllowance: async () => {},
    assertWithinBudget: async () => {},
    recordSpend: async (m, u) => calls.push(['spend', m, u.total_tokens]),
    recordUsage: async (uid, u) => calls.push(['usage', uid, u.total_tokens]),
    runTurn: async (o) => { calls.push(['turn', o.model, o.maxTokens, o.messages[1].content]); return { message: { content: 'result' }, usage: { total_tokens: 42 }, citations: [] } },
    ...over,
  })
  const task = { ownerUid: 'u1', prompt: 'do it' }
  const ok = await executeScheduledTask(task, deps())
  assert.equal(ok.status, 'completed'); assert.equal(ok.tokens, 42)
  assert.deepEqual(calls[0], ['turn', 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', 1500, 'do it'])
  assert.ok(calls.some((c) => c[0] === 'usage' && c[1] === 'u1'))

  const noAllow = await executeScheduledTask(task, deps({ assertWithinAllowance: async () => { throw Object.assign(new Error('x'), { allowance: {} }) } }))
  assert.deepEqual(noAllow, { status: 'skipped', error: 'daily_allowance_reached' })
  const noBudget = await executeScheduledTask(task, deps({ assertWithinBudget: async () => { throw Object.assign(new Error('x'), { budget: true }) } }))
  assert.equal(noBudget.error, 'gateway_budget_reached')
  const boom = await executeScheduledTask(task, deps({ runTurn: async () => { throw new Error('provider down') } }))
  assert.equal(boom.status, 'failed'); assert.match(boom.error, /provider down/)
})

// black box: the real entry point, token auth, ownership over HTTP
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.mjs')
test('gateway: schedule routes need a token, are per user, and stay off without SCHEDULER_ENABLED', async () => {
  const boot = async (env) => {
    const port = 23000 + Math.floor(Math.random() * 900)
    const child = spawn(process.execPath, [SRC], { env: { ...env, PORT: String(port), BIND_HOST: '127.0.0.1' }, stdio: 'ignore' })
    const base = `http://127.0.0.1:${port}`
    for (let i = 0; i < 80; i += 1) {
      try { if ((await fetch(`${base}/healthz`)).ok) return { base, child } } catch { /* not up */ }
      await new Promise((r) => setTimeout(r, 50))
    }
    child.kill('SIGKILL'); throw new Error('no start')
  }
  const d = await mkdtemp(join(tmpdir(), 'gw-'))
  const common = { GATEWAY_DEV_AUTH_SECRET: 's3cret-test', GATEWAY_ADMIN_TOKEN: 'adm', SCHEDULES_FILE: join(d, 's.json'), SCHEDULE_RUNS_FILE: join(d, 'r.json'), USAGE_FILE: join(d, 'u.json'), PLANS_FILE: join(d, 'p.json') }
  const off = await boot(common)
  try { assert.equal((await fetch(`${off.base}/v1/schedules`)).status, 503) } finally { off.child.kill('SIGKILL') }

  const on = await boot({ ...common, SCHEDULER_ENABLED: 'true', SCHEDULE_WORKER_INTERVAL_MS: '3600000' })
  try {
    const sess = async (email) => (await (await fetch(`${on.base}/v1/dev/session`, { method: 'POST', body: JSON.stringify({ email }) })).json()).token
    const [ta, tb] = [await sess('a@x.test'), await sess('b@x.test')]
    assert.equal((await fetch(`${on.base}/v1/schedules`)).status, 401)
    const body = { title: 'Morning brief', prompt: 'Latest news in Cambodia', frequency: 'daily', timeOfDay: '07:00', tzOffsetMinutes: 420 }
    const created = await fetch(`${on.base}/v1/schedules`, { method: 'POST', headers: { authorization: `Bearer ${ta}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal(created.status, 201)
    const { schedule } = await created.json()
    const listFor = async (t) => (await (await fetch(`${on.base}/v1/schedules`, { headers: { authorization: `Bearer ${t}` } })).json()).schedules
    assert.equal((await listFor(ta)).length, 1)
    assert.equal((await listFor(tb)).length, 0)
    const stolen = await fetch(`${on.base}/v1/schedules/${schedule.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${tb}` } })
    assert.equal(stolen.status, 404)
    // run-now goes through the whole runner; with no provider keys it fails cleanly, it does not crash
    const ran = await fetch(`${on.base}/v1/schedules/${schedule.id}/run`, { method: 'POST', headers: { authorization: `Bearer ${ta}` } })
    assert.equal(ran.status, 200)
    assert.equal((await ran.json()).run.status, 'failed')
    const runs = (await (await fetch(`${on.base}/v1/schedule-runs`, { headers: { authorization: `Bearer ${ta}` } })).json()).runs
    assert.equal(runs.length, 1)
    assert.equal((await (await fetch(`${on.base}/v1/schedule-runs`, { headers: { authorization: `Bearer ${tb}` } })).json()).runs.length, 0)
  } finally { on.child.kill('SIGKILL') }
})
