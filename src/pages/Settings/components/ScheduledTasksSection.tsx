/**
 * Scheduled tasks. A task is a prompt plus a recurrence. It runs on the gateway
 * under the owner's account, with that plan's model and daily allowance. It can
 * use web search but cannot reach browser memory, skills or connectors, because
 * those live only in the browser. The screen says so rather than implying more.
 */

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardBody, Input, Select, SelectItem, Textarea } from '@heroui/react'

import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useSettingsLabel } from '../SettingsContext'
import { useAuth } from '@/lib/auth'
import { gatewayFetch } from '@/lib/auth/gatewayFetch'
import { gatewayBase } from '@/lib/llm/managed-lane'
import { SignInDialog } from '@/components/auth/SignInDialog'

interface Task {
  id: string
  title: string
  prompt: string
  frequency: 'once' | 'daily' | 'weekly' | 'monthly'
  timeOfDay: string
  weekday?: number
  dayOfMonth?: number
  status: 'active' | 'paused' | 'completed'
  nextRunAt?: string
  lastRunAt?: string
}
interface Run {
  id: string
  scheduledTaskId: string
  startedAt: string
  status: 'completed' | 'skipped' | 'failed'
  text?: string
  error?: string
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await gatewayFetch(`${gatewayBase()}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error || `http_${res.status}`), { status: res.status })
  return body as T
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '-')

export function ScheduledTasksSection() {
  const { t } = useI18n()
  useSettingsLabel(t('Scheduled Tasks'))
  const { user, isSignedIn, isConfigured } = useAuth()
  const [showSignIn, setShowSignIn] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [off, setOff] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    title: '',
    prompt: '',
    frequency: 'daily' as Task['frequency'],
    timeOfDay: '09:00',
    weekday: 1,
    dayOfMonth: 1,
    runAt: '',
  })

  const refresh = useCallback(async () => {
    if (!isSignedIn) return
    try {
      const [a, b] = await Promise.all([
        api<{ schedules: Task[] }>('/v1/schedules'),
        api<{ runs: Run[] }>('/v1/schedule-runs'),
      ])
      setTasks(a.schedules)
      setRuns(b.runs.slice(-20).reverse())
      setOff(false)
      setError('')
    } catch (e) {
      if ((e as Error).message === 'scheduler_disabled') setOff(true)
      else setError((e as Error).message)
    }
  }, [isSignedIn])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const create = () =>
    act(async () => {
      const body: Record<string, unknown> = {
        title: form.title,
        prompt: form.prompt,
        frequency: form.frequency,
        timeOfDay: form.timeOfDay,
        tzOffsetMinutes: -new Date().getTimezoneOffset(),
      }
      if (form.frequency === 'weekly') body.weekday = form.weekday
      if (form.frequency === 'monthly') body.dayOfMonth = form.dayOfMonth
      if (form.frequency === 'once') body.runAt = new Date(form.runAt).toISOString()
      await api('/v1/schedules', { method: 'POST', body: JSON.stringify(body) })
      setForm({ ...form, title: '', prompt: '' })
    })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-foreground text-lg font-semibold">{t('Scheduled Tasks')}</h3>
        <p className="text-muted text-sm">
          {t('Recurring work that runs on our servers, not on this device.')}
        </p>
      </div>

      <Card shadow="none" className="border border-divider">
        <CardBody className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Icon name="ClockRotateRight" className="text-muted w-5 h-5" />
            <span className="text-foreground font-medium">
              {t('Tasks run with your prompt and web search only. They cannot use your browser memory, skills or connectors.')}
            </span>
          </div>
          {!isSignedIn && (
            <>
              <p className="text-muted">
                {isConfigured
                  ? t('Sign in to create tasks that belong to your account and keep running after you close this tab.')
                  : t('Sign-in is not configured for this deployment yet, so tasks can only run while this window is open.')}
              </p>
              {isConfigured && (
                <Button color="primary" size="sm" className="self-start" onPress={() => setShowSignIn(true)}>
                  {t('Sign in')}
                </Button>
              )}
            </>
          )}
          {isSignedIn && user?.email && (
            <p className="text-muted text-xs">
              {t('Signed in as')} {user.email}
            </p>
          )}
          {off && (
            <p className="text-warning text-sm">
              {t('The scheduler is switched off on the server, so tasks cannot be saved or run yet.')}
            </p>
          )}
        </CardBody>
      </Card>

      {isSignedIn && !off && (
        <>
          <Card shadow="none" className="border border-divider">
            <CardBody className="flex flex-col gap-3">
              <Input label={t('Title')} value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea label={t('Prompt')} value={form.prompt} maxLength={2000} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
              <div className="flex flex-wrap gap-3">
                <Select
                  label={t('Repeat')}
                  className="max-w-3xs"
                  selectedKeys={[form.frequency]}
                  onSelectionChange={(k) => setForm({ ...form, frequency: Array.from(k)[0] as Task['frequency'] })}
                >
                  <SelectItem key="once">{t('Once')}</SelectItem>
                  <SelectItem key="daily">{t('Daily')}</SelectItem>
                  <SelectItem key="weekly">{t('Weekly')}</SelectItem>
                  <SelectItem key="monthly">{t('Monthly')}</SelectItem>
                </Select>
                {form.frequency === 'once' ? (
                  <Input type="datetime-local" label={t('Run at')} className="max-w-3xs" value={form.runAt} onChange={(e) => setForm({ ...form, runAt: e.target.value })} />
                ) : (
                  <Input type="time" label={t('Time')} className="max-w-3xs" value={form.timeOfDay} onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })} />
                )}
                {form.frequency === 'weekly' && (
                  <Select
                    label={t('Day of the week')}
                    className="max-w-3xs"
                    selectedKeys={[String(form.weekday)]}
                    onSelectionChange={(k) => setForm({ ...form, weekday: Number(Array.from(k)[0]) })}
                  >
                    {WEEKDAYS.map((d, i) => (
                      <SelectItem key={String(i)}>{t(d)}</SelectItem>
                    ))}
                  </Select>
                )}
                {form.frequency === 'monthly' && (
                  <Input type="number" min={1} max={28} label={t('Day of the month')} className="max-w-3xs" value={String(form.dayOfMonth)} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })} />
                )}
              </div>
              <Button color="primary" size="sm" className="self-start" isLoading={busy} isDisabled={!form.title.trim() || !form.prompt.trim() || (form.frequency === 'once' && !form.runAt)} onPress={create}>
                {t('Create task')}
              </Button>
            </CardBody>
          </Card>

          {error && <p className="text-danger text-sm">{error}</p>}

          {tasks.length === 0 && <p className="text-muted text-sm">{t('No scheduled tasks yet.')}</p>}
          {tasks.map((task) => {
            const last = runs.find((r) => r.scheduledTaskId === task.id)
            return (
              <Card key={task.id} shadow="none" className="border border-divider">
                <CardBody className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground font-medium">{task.title}</span>
                    <span className="text-muted text-xs">{t(task.status === 'active' ? 'Active' : task.status === 'paused' ? 'Paused' : 'Done')}</span>
                  </div>
                  <p className="text-muted text-sm whitespace-pre-wrap">{task.prompt}</p>
                  <p className="text-muted text-xs">
                    {t('Next run')}: {fmt(task.nextRunAt)} / {t('Last run')}: {fmt(task.lastRunAt)}
                  </p>
                  {last && (
                    <p className="text-sm whitespace-pre-wrap">
                      {last.status === 'completed' ? last.text : last.error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" isDisabled={busy} onPress={() => act(() => api(`/v1/schedules/${task.id}/run`, { method: 'POST' }))}>
                      {t('Run now')}
                    </Button>
                    {task.status !== 'completed' && (
                      <Button size="sm" variant="flat" isDisabled={busy} onPress={() => act(() => api(`/v1/schedules/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: task.status === 'active' ? 'paused' : 'active' }) }))}>
                        {task.status === 'active' ? t('Pause') : t('Resume')}
                      </Button>
                    )}
                    <Button size="sm" variant="flat" color="danger" isDisabled={busy} onPress={() => act(() => api(`/v1/schedules/${task.id}`, { method: 'DELETE' }))}>
                      {t('Delete')}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </>
      )}

      <SignInDialog isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  )
}

export default ScheduledTasksSection
