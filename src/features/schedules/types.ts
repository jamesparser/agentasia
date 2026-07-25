export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron'
export type ScheduledTaskStatus = 'active' | 'paused' | 'completed' | 'error'

/** Persisted schedule metadata. Execution must run in a trusted server worker,
 * never solely from a browser timer. */
export interface ScheduledTask {
  id: string
  userId: string
  title: string
  prompt: string
  frequency: ScheduleFrequency
  cron?: string
  timezone: string
  nextRunAt: string
  lastRunAt?: string
  status: ScheduledTaskStatus
  connectorIds?: string[]
  requireToolApproval: boolean
  createdAt: string
  updatedAt: string
}

export interface ScheduledTaskRun {
  id: string
  scheduledTaskId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  error?: string
}
