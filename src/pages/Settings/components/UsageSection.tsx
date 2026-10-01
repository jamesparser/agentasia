/**
 * Usage and Subscription.
 *
 * The owner asked for the old "Traces" screen to become something a paying user
 * would recognise: the plan, what is left this month, and an upgrade path when it
 * runs low. Two sections come out of that:
 *
 *   Usage        - plan, requests used, remaining, a bar, and an upgrade prompt
 *                  that only appears at 80%.
 *   Subscription - the four plans from src/config/agentasia.ts with an upgrade
 *                  button on each.
 *
 * Both are honest about the two things that are not real yet: the count is
 * measured on this device (the gateway exposes no public usage route - every
 * quota endpoint answers 401), and there is no billing backend, so the upgrade
 * button says so instead of pretending to succeed.
 */

import { useCallback, useState } from 'react'
import { Button, Card, CardBody, Chip, Progress } from '@heroui/react'

import { useI18n } from '@/i18n'
import { AGENTASIA } from '@/config/agentasia'
import type { PlanId } from '@/lib/llm/managed-lane'
import { getUsage, PLAN_ALLOWANCE } from '@/lib/usage/localUsage'
import { planLabel, requestUpgrade, usePlan } from '@/lib/usage/planStore'
import { useSettingsLabel } from '../SettingsContext'

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'smallBusiness', 'enterprise']

function planPrice(plan: PlanId): string {
  const usd = AGENTASIA.plans[plan]?.priceUsdMonthly ?? 0
  return usd === 0 ? 'Free' : `$${usd}/mo`
}

function UpgradeNotice({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n()
  return (
    <div
      role="status"
      className="border-warning bg-warning-50 dark:bg-warning-500/10 mt-4 rounded-xl border p-3"
    >
      <p className="text-warning text-sm font-medium">
        {t('Billing is not connected yet, so this upgrade could not be completed.')}
      </p>
      <p className="text-muted mt-1 text-xs">
        {t(
          'Plans and limits are enforced by the gateway. Connect a payment provider to take upgrades.',
        )}
      </p>
      <Button size="sm" variant="light" className="mt-2" onPress={onDismiss}>
        {t('Dismiss')}
      </Button>
    </div>
  )
}

export function UsageSection() {
  const { t } = useI18n()
  const plan = usePlan()
  useSettingsLabel(t('Usage'))
  const [dismissed, setDismissed] = useState(false)

  const usage = getUsage(plan)
  const pct = Math.round(usage.fraction * 100)

  const onUpgrade = useCallback(() => {
    setDismissed(false)
    requestUpgrade(plan === 'free' ? 'pro' : 'enterprise')
  }, [plan])

  // Only nag past 80%: below that the number is informative, not actionable.
  const showPrompt = usage.shouldSuggestUpgrade || usage.limitHit

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-foreground text-lg font-semibold">{t('Usage')}</h3>
        <p className="text-muted text-sm">
          {t('Requests made with AgentAsia this month.')}
        </p>
      </div>

      <Card shadow="none" className="border border-divider">
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat" color={plan === 'free' ? 'default' : 'primary'}>
                {planLabel(plan)}
              </Chip>
              <span className="text-muted text-xs">{planPrice(plan)}</span>
            </div>
            <span className="text-muted text-xs">{usage.month}</span>
          </div>

          <Progress
            value={pct}
            aria-label={t('Monthly usage')}
            showValueLabel
            formatOptions={{ style: 'percent' }}
            color={pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'success'}
          />

          <div className="flex items-baseline justify-between">
            <span className="text-foreground text-2xl font-semibold tabular-nums">
              {usage.remaining.toLocaleString()}
            </span>
            <span className="text-muted text-sm">
              {t('left of')} {usage.allowance.toLocaleString()} ·{' '}
              {usage.requests.toLocaleString()} {t('used')}
            </span>
          </div>

          {usage.limitHit && (
            <p className="text-danger text-xs">
              {t('The gateway reported your limit as reached.')}
            </p>
          )}

          <p className="text-muted text-xs">
            {t(
              'Counted on this device. The gateway enforces the real limit and does not yet publish it to the browser.',
            )}
          </p>
        </CardBody>
      </Card>

      {showPrompt && !dismissed && plan === 'free' && (
        <div className="border-primary bg-primary-50 dark:bg-primary-500/10 rounded-xl border p-4">
          <p className="text-foreground text-sm font-medium">
            {t('You are close to your monthly limit.')}
          </p>
          <p className="text-muted mt-1 text-xs">
            {t('Upgrade for a higher request allowance and larger models.')}
          </p>
          <Button color="primary" size="sm" className="mt-3" onPress={onUpgrade}>
            {t('Upgrade')}
          </Button>
          <UpgradeNotice onDismiss={() => setDismissed(true)} />
        </div>
      )}
    </div>
  )
}

export function SubscriptionSection() {
  const { t } = useI18n()
  const plan = usePlan()
  useSettingsLabel(t('Subscription'))
  const [notice, setNotice] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-foreground text-lg font-semibold">{t('Subscription')}</h3>
        <p className="text-muted text-sm">
          {t('Every plan runs on NVIDIA Nemotron via Nebius Token Factory.')}
        </p>
      </div>

      {notice && <UpgradeNotice onDismiss={() => setNotice(false)} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLAN_ORDER.map((id) => {
          const cfg = AGENTASIA.plans[id]
          if (!cfg) return null
          const isCurrent = id === plan
          return (
            <Card
              key={id}
              shadow="none"
              className={`border ${isCurrent ? 'border-primary' : 'border-divider'}`}
            >
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold">{cfg.label}</span>
                  {isCurrent && (
                    <Chip size="sm" color="primary" variant="flat">
                      {t('Current plan')}
                    </Chip>
                  )}
                </div>
                <span className="text-foreground text-xl font-semibold tabular-nums">
                  {planPrice(id)}
                </span>
                <p className="text-muted text-xs">
                  {PLAN_ALLOWANCE[id].toLocaleString()} {t('requests / month')}
                </p>
                <p className="text-muted text-xs">
                  {t('Model')}: {cfg.model.split('/').pop()}
                </p>
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant={id === 'pro' ? 'solid' : 'bordered'}
                    className="mt-1 self-start"
                    onPress={() => {
                      setNotice(false)
                      requestUpgrade(id)
                      setNotice(true)
                    }}
                  >
                    {t('Upgrade')}
                  </Button>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
