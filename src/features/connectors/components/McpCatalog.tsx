import { Button } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { MCP_PRESETS, type McpPreset } from '../lib/mcp-presets'

interface McpCatalogProps {
  onPick: (preset: McpPreset) => void
  onOpenApps: () => void
}

/** One-click catalog of servers. Each user connects their own account. */
export function McpCatalog({ onPick, onOpenApps }: McpCatalogProps) {
  const { t } = useI18n()

  return (
    <div className="mb-6">
      <h4 className="text-foreground mb-3 text-sm font-semibold">
        {t('Popular servers')}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MCP_PRESETS.map((preset) => {
          const builtin = preset.auth === 'builtin'
          const apps = preset.auth === 'apps-tab'
          const blocked = preset.oauthOnly === true || preset.noBrowser === true
          return (
            <div
              key={preset.id}
              className="border-divider flex flex-col gap-2 rounded-xl border p-4"
            >
              <div className="flex items-center gap-2">
                <Icon name="Server" className="text-default-500 h-4 w-4" />
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
              <p className="text-default-500 text-xs">{t(preset.description)}</p>
              {blocked && (
                <p className="text-warning text-xs">
                  {preset.noBrowser
                    ? t(
                        'This server refuses connections from web pages, so it cannot be used from the browser yet',
                      )
                    : t('Needs vendor sign-in, not available in the browser yet')}
                </p>
              )}
              {builtin ? (
                <span className="text-success self-start text-xs">
                  {t('Included')}
                </span>
              ) : apps ? (
                <Button size="sm" variant="flat" className="self-start" onPress={onOpenApps}>
                  {t('Open Apps')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  className="self-start"
                  isDisabled={blocked}
                  onPress={() => onPick(preset)}
                >
                  {t('Connect')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
