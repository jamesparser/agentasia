import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const storagePath = process.env.SCHEDULES_FILE || '/data/schedules.json'

async function load() {
  try { return JSON.parse(await readFile(storagePath, 'utf8')) } catch { return [] }
}
async function save(tasks) {
  await mkdir(dirname(storagePath), { recursive: true })
  await writeFile(storagePath, JSON.stringify(tasks, null, 2))
}

export async function listSchedules() { return load() }
export async function createSchedule(input) {
  if (!input?.title?.trim() || !input?.prompt?.trim()) throw new Error('title_and_prompt_required')
  if (!['once', 'daily', 'weekly', 'monthly', 'cron'].includes(input.frequency)) throw new Error('invalid_frequency')
  const now = new Date().toISOString()
  const task = {
    id: randomUUID(), title: input.title.trim(), prompt: input.prompt.trim(),
    frequency: input.frequency, cron: input.cron || undefined,
    timezone: input.timezone || 'UTC', nextRunAt: input.nextRunAt || now,
    status: 'active', requireToolApproval: input.requireToolApproval !== false,
    createdAt: now, updatedAt: now,
  }
  const tasks = await load(); tasks.push(task); await save(tasks); return task
}
export async function updateSchedule(id, updates) {
  const tasks = await load(); const index = tasks.findIndex((task) => task.id === id)
  if (index < 0) throw new Error('schedule_not_found')
  tasks[index] = { ...tasks[index], ...updates, id, updatedAt: new Date().toISOString() }
  await save(tasks); return tasks[index]
}
export async function queueScheduleRun(id) {
  const task = await updateSchedule(id, {})
  if (task.status !== 'active') throw new Error('schedule_not_active')
  // A worker will consume this persisted queue in the next implementation slice.
  return { id: randomUUID(), scheduledTaskId: id, status: 'queued', createdAt: new Date().toISOString() }
}
