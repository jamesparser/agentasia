import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directory = await mkdtemp(join(tmpdir(), 'agentasia-worker-'))
process.env.SCHEDULES_FILE = join(directory, 'schedules.json')
process.env.SCHEDULE_RUNS_FILE = join(directory, 'runs.json')
const { createSchedule } = await import('../src/schedules.mjs')
const { processDueSchedules, listScheduleRuns } = await import('../src/schedule-worker.mjs')
const task = await createSchedule({ title: 'One-time reminder', prompt: 'Do not execute tools', frequency: 'once', nextRunAt: '2020-01-01T00:00:00.000Z' })
const runs = await processDueSchedules(new Date('2021-01-01T00:00:00.000Z'))
assert.equal(runs.length, 1)
assert.equal(runs[0].status, 'awaiting_approval')
assert.equal((await listScheduleRuns(task.id)).length, 1)
console.log('schedule-worker tests passed')
