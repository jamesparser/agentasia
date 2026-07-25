import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { listSchedules, updateSchedule } from './schedules.mjs'

const runsPath = process.env.SCHEDULE_RUNS_FILE || '/data/schedule-runs.json'
async function loadRuns() { try { return JSON.parse(await readFile(runsPath, 'utf8')) } catch { return [] } }
async function saveRuns(runs) { await mkdir(dirname(runsPath), { recursive: true }); await writeFile(runsPath, JSON.stringify(runs.slice(-500), null, 2)) }
export async function listScheduleRuns(scheduleId) { const runs = await loadRuns(); return scheduleId ? runs.filter((run) => run.scheduledTaskId === scheduleId) : runs }
function nextRun(task, now) {
  if (task.frequency === 'once') return null
  const next = new Date(now)
  if (task.frequency === 'daily') next.setUTCDate(next.getUTCDate() + 1)
  else if (task.frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7)
  else if (task.frequency === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1)
  else return new Date(now.getTime() + 60 * 60 * 1000) // cron parser comes with the durable worker service
  return next
}
export async function processDueSchedules(now = new Date()) {
  const tasks = await listSchedules(); const runs = []
  for (const task of tasks) {
    if (task.status !== 'active' || new Date(task.nextRunAt) > now) continue
    const run = { id: randomUUID(), scheduledTaskId: task.id, status: 'awaiting_approval', startedAt: now.toISOString(), completedAt: now.toISOString(), reason: 'Worker never invokes models or connector tools without an authenticated user approval flow.' }
    runs.push(run)
    const next = nextRun(task, now)
    await updateSchedule(task.id, { lastRunAt: now.toISOString(), nextRunAt: next?.toISOString(), status: next ? 'active' : 'completed' })
  }
  if (runs.length) { const allRuns = await loadRuns(); await saveRuns([...allRuns, ...runs]) }
  return runs
}
export function startScheduleWorker(intervalMs = Number(process.env.SCHEDULE_WORKER_INTERVAL_MS || 60000)) {
  const tick = () => processDueSchedules().catch((error) => console.error('schedule worker failed', error))
  tick(); return setInterval(tick, intervalMs)
}
