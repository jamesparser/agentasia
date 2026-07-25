import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.SCHEDULES_FILE = join(await mkdtemp(join(tmpdir(), 'agentasia-schedules-')), 'schedules.json')
const { createSchedule, listSchedules, queueScheduleRun } = await import('../src/schedules.mjs')

await assert.rejects(() => createSchedule({ title: '', prompt: 'x', frequency: 'daily' }), /title_and_prompt_required/)
const task = await createSchedule({ title: 'Daily brief', prompt: 'Summarize updates', frequency: 'daily' })
assert.equal((await listSchedules()).length, 1)
assert.equal((await queueScheduleRun(task.id)).status, 'queued')
console.log('schedules tests passed')
