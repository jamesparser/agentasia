// Per-user scheduled tasks. Every task belongs to a verified uid, so one user's
// prompt can never fire under another's account. A task is a prompt plus a
// recurrence; it runs on the server with the model and allowance of its owner's
// plan (see schedule-runner.mjs) and cannot reach anything stored in a browser.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const storagePath = () => process.env.SCHEDULES_FILE || '/data/schedules.json'
export const FREQUENCIES = ['once', 'daily', 'weekly', 'monthly']
const MAX_PER_USER = () => Number(process.env.SCHEDULES_MAX_PER_USER) || 5

async function load() {
  try { return JSON.parse(await readFile(storagePath(), 'utf8')) } catch { return [] }
}
async function save(tasks) {
  const path = storagePath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(`${path}.tmp`, JSON.stringify(tasks, null, 2))
  await rename(`${path}.tmp`, path)
}
let queue = Promise.resolve()
const serial = (fn) => { const next = queue.catch(() => {}).then(fn); queue = next; return next }

const bad = (code, status = 400) => Object.assign(new Error(code), { statusCode: status, code })

/**
 * Next UTC instant strictly after `after` that matches the recurrence.
 * `tzOffsetMinutes` is minutes EAST of UTC (UTC+7 = 420) and is applied as a
 * fixed offset: a task keeps its wall-clock hour except across daylight saving.
 */
export function computeNextRun(spec, after = new Date()) {
  if (spec.frequency === 'once') {
    const t = Date.parse(spec.runAt)
    return Number.isFinite(t) && t > after.getTime() ? new Date(t) : null
  }
  const [hh, mm] = String(spec.timeOfDay || '09:00').split(':').map(Number)
  const off = (Number(spec.tzOffsetMinutes) || 0) * 60_000
  const localNow = new Date(after.getTime() + off)
  for (let d = 0; d < 400; d += 1) {
    const day = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + d, hh, mm))
    const utc = day.getTime() - off
    if (utc <= after.getTime()) continue
    if (spec.frequency === 'weekly' && day.getUTCDay() !== Number(spec.weekday)) continue
    if (spec.frequency === 'monthly' && day.getUTCDate() !== Number(spec.dayOfMonth)) continue
    return new Date(utc)
  }
  return null
}

function validate(input, partial = false) {
  const out = {}
  if (!partial || input.title !== undefined) {
    const title = String(input.title || '').trim()
    if (!title || title.length > 100) throw bad('title_required_max_100')
    out.title = title
  }
  if (!partial || input.prompt !== undefined) {
    const prompt = String(input.prompt || '').trim()
    if (!prompt || prompt.length > 2000) throw bad('prompt_required_max_2000')
    out.prompt = prompt
  }
  if (!partial || input.frequency !== undefined) {
    if (!FREQUENCIES.includes(input.frequency)) throw bad('invalid_frequency')
    out.frequency = input.frequency
  }
  if (!partial || input.timeOfDay !== undefined) {
    const t = String(input.timeOfDay ?? '09:00')
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw bad('invalid_time_of_day')
    out.timeOfDay = t
  }
  if (!partial || input.tzOffsetMinutes !== undefined) {
    const o = Number(input.tzOffsetMinutes ?? 0)
    if (!Number.isInteger(o) || o < -840 || o > 840) throw bad('invalid_timezone_offset')
    out.tzOffsetMinutes = o
  }
  if (input.weekday !== undefined) {
    const w = Number(input.weekday)
    if (!Number.isInteger(w) || w < 0 || w > 6) throw bad('invalid_weekday')
    out.weekday = w
  }
  if (input.dayOfMonth !== undefined) {
    const m = Number(input.dayOfMonth)
    if (!Number.isInteger(m) || m < 1 || m > 28) throw bad('invalid_day_of_month')
    out.dayOfMonth = m
  }
  if (input.runAt !== undefined) out.runAt = String(input.runAt)
  return out
}

const publicView = ({ ownerUid, ...task }) => task

export async function listSchedules(owner) {
  return (await load()).filter((t) => t.ownerUid === owner).map(publicView)
}
/** Used by the worker only: every owner's tasks. */
export async function allSchedules() { return load() }

export async function createSchedule(input, owner) {
  if (!owner) throw bad('owner_required', 401)
  const spec = validate(input)
  if (spec.frequency === 'weekly' && spec.weekday === undefined) throw bad('weekday_required')
  if (spec.frequency === 'monthly' && spec.dayOfMonth === undefined) throw bad('day_of_month_required')
  const next = computeNextRun(spec)
  if (!next) throw bad(spec.frequency === 'once' ? 'run_at_must_be_in_future' : 'no_next_run')
  return serial(async () => {
    const tasks = await load()
    if (tasks.filter((t) => t.ownerUid === owner && t.status !== 'completed').length >= MAX_PER_USER()) {
      throw bad('schedule_limit_reached', 409)
    }
    const now = new Date().toISOString()
    const task = { id: randomUUID(), ownerUid: owner, ...spec, status: 'active', nextRunAt: next.toISOString(), createdAt: now, updatedAt: now }
    tasks.push(task)
    await save(tasks)
    return publicView(task)
  })
}

export function updateSchedule(owner, id, updates) {
  return serial(async () => {
    const tasks = await load()
    const i = tasks.findIndex((t) => t.id === id && t.ownerUid === owner)
    if (i < 0) throw bad('schedule_not_found', 404)
    const patch = validate(updates, true)
    if (updates.status !== undefined) {
      if (!['active', 'paused'].includes(updates.status)) throw bad('invalid_status')
      patch.status = updates.status
    }
    const merged = { ...tasks[i], ...patch, updatedAt: new Date().toISOString() }
    if (merged.status === 'active' && (patch.timeOfDay || patch.tzOffsetMinutes !== undefined || patch.weekday !== undefined || patch.dayOfMonth !== undefined || patch.frequency || updates.status === 'active' || patch.runAt)) {
      const next = computeNextRun(merged)
      if (!next) throw bad('no_next_run')
      merged.nextRunAt = next.toISOString()
    }
    tasks[i] = merged
    await save(tasks)
    return publicView(merged)
  })
}

export function deleteSchedule(owner, id) {
  return serial(async () => {
    const tasks = await load()
    const kept = tasks.filter((t) => !(t.id === id && t.ownerUid === owner))
    if (kept.length === tasks.length) throw bad('schedule_not_found', 404)
    await save(kept)
    return { deleted: id }
  })
}

/** Worker-only: record a run's outcome and advance the clock. Not owner checked. */
export function markRan(id, now) {
  return serial(async () => {
    const tasks = await load()
    const i = tasks.findIndex((t) => t.id === id)
    if (i < 0) return null
    const t = tasks[i]
    const next = t.frequency === 'once' ? null : computeNextRun(t, now)
    tasks[i] = { ...t, lastRunAt: now.toISOString(), nextRunAt: next ? next.toISOString() : t.nextRunAt, status: next ? 'active' : 'completed', updatedAt: now.toISOString() }
    await save(tasks)
    return tasks[i]
  })
}
