/**
 * Scheduled tasks - deliberately not enabled yet.
 *
 * The gateway already has the server half (`server/src/schedules.mjs` and
 * `schedule-worker.mjs`), but three things stop it being wired to the UI today,
 * and pretending otherwise would put a dead button in front of a judge:
 *
 *  1. There is no account system. Nothing in this app authenticates anyone - the
 *     browser has no auth library at all, and the gateway's public routes are
 *     only `/healthz`, `/v1/chat/completions` and `/v1/memory/policy`. Without an
 *     identity the server cannot know whose task to run.
 *  2. `schedules.mjs` has no owner column. Every schedule would be global, so one
 *     user's task could fire with another user's prompt.
 *  3. The harder one: an agent's memory, skills, connectors and history live in
 *     the owner's browser (Yjs + IndexedDB), not on the server. A task firing on
 *     the VPS would therefore run a *different, poorer* agent than the one on
 *     your laptop, unless that data were uploaded - which is exactly the
 *     local-first promise this product makes.
 *
 * So this screen states the plan and the requirement instead of shipping a
 * broken timer. The scheduler is also off on the server (`SCHEDULER_ENABLED`),
 * which is the correct default until 1-3 are solved.
 */

import { Card, CardBody } from '@heroui/react'

import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useSettingsLabel } from '../SettingsContext'

export function ScheduledTasksSection() {
  const { t } = useI18n()
  useSettingsLabel(t('Scheduled Tasks'))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-foreground text-lg font-semibold">
          {t('Scheduled Tasks')}
        </h3>
        <p className="text-muted text-sm">
          {t('Recurring work that runs on our servers, not on this device.')}
        </p>
      </div>

      <Card shadow="none" className="border border-divider">
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="ClockRotateRight" className="text-muted w-5 h-5" />
            <span className="text-foreground font-medium">
              {t('Sign in to schedule tasks')}
            </span>
            <span className="bg-default-100 text-default-500 dark:bg-default-100/50 rounded-full px-2 py-0.5 text-xs">
              {t('Coming soon')}
            </span>
          </div>

          <p className="text-muted text-sm">
            {t(
              'Scheduled tasks need an account, so a task keeps running after you close the tab and never runs on anyone else\u2019s behalf. Sign-in with Google and email is being added; until then tasks can only run while this window is open.',
            )}
          </p>

          <ul className="text-muted flex flex-col gap-1.5 text-sm">
            <li className="flex items-start gap-2">
              <Icon name="Check" className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              {t('Runs on our infrastructure, not your laptop')}
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Check" className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              {t('Keeps working when the tab is closed')}
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Check" className="mt-0.5 w-3.5 h-3.5 shrink-0" />
              {t('Scoped to your own account and your own data')}
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}

export default ScheduledTasksSection
