import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { allSchedules, markRan } from './schedules.mjs'

const runsPath = () => process.env.SCHEDULE_RUNS_FILE || '/data/schedule-runs.json'
async function loadRuns() { try { return JSON.parse(await readFile(runsPath(), 'utf8')) } catch { return [] } }
let queue = Promise.resolve()
const serial = (fn) => { const next = queue.catch(() => {}).then(fn); queue = next; return next }
function appendRun(run) {
  return serial(async () => {
    const path = runsPath()
    const runs = [...(await loadRuns()), run].slice(-1000)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(`${path}.tmp`, JSON.stringify(runs, null, 2))
    await rename(`${path}.tmp`, path)
  })
}

/** One owner's runs only, newest last. */
export async function listScheduleRuns(owner, scheduleId) {
  return (await loadRuns())
    .filter((r) => r.ownerUid === owner && (!scheduleId || r.scheduledTaskId === scheduleId))
    .map(({ ownerUid, ...run }) => run)
}

/** Run one task now (due run or run-now) and record the outcome. */
export async function runTask(task, execute, now = new Date()) {
  const startedAt = now.toISOString()
  // Advance the clock first so a slow run can never be picked up twice.
  const outcome = await execute(task)
  const run = { id: randomUUID(), ownerUid: task.ownerUid, scheduledTaskId: task.id, startedAt, completedAt: new Date().toISOString(), ...outcome }
  await appendRun(run)
  const { ownerUid, ...visible } = run
  return visible
}

export async function processDueSchedules({ now = new Date(), execute }) {
  if (typeof execute !== 'function') throw new Error('execute_required')
  const runs = []
  for (const task of await allSchedules()) {
    if (task.status !== 'active' || new Date(task.nextRunAt) > now) continue
    await markRan(task.id, now)
    runs.push(await runTask(task, execute, now))
  }
  return runs
}

export function startScheduleWorker(execute, intervalMs = Number(process.env.SCHEDULE_WORKER_INTERVAL_MS || 60000)) {
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try { await processDueSchedules({ execute }) } catch (error) { console.error('schedule worker failed', error) } finally { busy = false }
  }
  tick()
  return setInterval(tick, intervalMs)
}
