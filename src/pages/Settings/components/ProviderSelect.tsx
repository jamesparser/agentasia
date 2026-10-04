/**
 * ProviderSelect — Grid for selecting which LLM provider to add.
 *
 * Route: #settings/providers/add
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardBody, Button } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { LLMProvider } from '@/types'
import type { IconName } from '@/lib/types'
import localI18n from '../i18n'
import { PROVIDERS, isProviderVisible } from '../providers'
import { usePrivacyMode } from '@/hooks/usePrivacyMode'

export function ProviderSelect() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { isProviderAllowed } = usePrivacyMode()

  const handleSelectProvider = (provider: LLMProvider) => {
    navigate(`${location.pathname}#settings/providers/add/${provider}`, {
      replace: true,
    })
  }

  // Two independent gates: product exposure (hide BYOK / in-browser LLM in the
  // managed beta) and privacy mode (trust level). Both must pass.
  const providers = PROVIDERS(lang, t).filter(
    (p) => isProviderAllowed(p.provider) && isProviderVisible(p.provider),
  )

  return (
    <div data-testid="llm-providers" className="space-y-4">
      <Card className="border border-primary-200 bg-primary-50/40 dark:bg-primary-50/10">
        <CardBody className="flex flex-row items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="font-semibold">AgentAsia Freemium</p>
            <p className="text-xs text-default-600">
              Hosted multilingual models for Chat, Code, and Agent mode.
            </p>
          </div>
          <Button
            color="primary"
            size="sm"
            onPress={() =>
              navigate(
                `${location.pathname}#settings/providers/add/openai-compatible?preset=agentasia-freemium`,
                { replace: true },
              )
            }
          >
            One-click setup
          </Button>
        </CardBody>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {providers.map((provider) => (
          <Card
            key={provider.provider}
            className="h-20 hover:bg-primary-50"
            isPressable
            onPress={() =>
              handleSelectProvider(provider.provider as LLMProvider)
            }
          >
            <CardBody className="flex flex-col items-center justify-center gap-1.5 p-2">
              <Icon name={provider.icon as IconName} className="h-5 w-5" />
              <span className="text-xs text-center leading-tight">
                {provider.name}
              </span>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
