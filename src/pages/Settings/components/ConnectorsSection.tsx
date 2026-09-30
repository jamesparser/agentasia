/**
 * ConnectorsSection — Settings section for managing external service connectors.
 *
 * Uses hash-based sub-routing:
 *   #settings/connectors       → list view
 *   #settings/connectors/add   → add-connector wizard
 *   #settings/connectors/:id   → existing connector settings
 *
 * Displays:
 *  - OAuth-based app connectors (Google Drive, Gmail, Notion, etc.)
 *  - API connectors (coming soon)
 *  - MCP server connectors (coming soon)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Spinner, Tab, Tabs } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import { useConnectorStore } from '@/features/connectors/stores'
import { ConnectorCard } from '@/features/connectors/components'
import { ConnectorWizardInline } from '@/features/connectors/components/ConnectorWizardInline'
import { CustomMcpWizard } from '@/features/connectors/components/CustomMcpWizard'
import { ConnectorSettingsInline } from '@/features/connectors/components/ConnectorSettingsInline'
import type { ConnectorCategory } from '@/features/connectors/types'
import { useSettingsScope } from '../SettingsContext'
import { useActiveSpaceId, entityBelongsToSpace } from '@/stores/spaceStore'
import localI18n from '@/features/connectors/pages/i18n'

export function ConnectorsSection() {
  const { t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { activeElement } = useHashHighlight()
  const scope = useSettingsScope()
  const spaceId = useActiveSpaceId()

  // Apps and MCP servers are both reachable. This was pinned to 'app', so the
  // MCP tab could not be opened at all and the wizard fell through to a provider
  // grid that returns nothing for non-app categories - which is why every MCP
  // entry read "coming soon".
  const [selectedTab, setSelectedTab] = useState<ConnectorCategory>('app')
  const [showMcpWizard, setShowMcpWizard] = useState(false)

  const {
    connectors,
    isLoading,
    isInitialized,
    initialize,
    getConnector,
    getAppConnectors,
    getApiConnectors,
    getMcpConnectors,
    deleteConnector,
  } = useConnectorStore()

  // Initialize connector store on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  // Get connectors based on selected tab, filtered by space scope
  const currentConnectors = useMemo(() => {
    let list: typeof connectors
    switch (selectedTab) {
      case 'app':
        list = getAppConnectors()
        break
      case 'api':
        list = getApiConnectors()
        break
      case 'mcp':
        list = getMcpConnectors()
        break
      default:
        list = []
    }
    if (scope === 'space') {
      return list.filter((c) => entityBelongsToSpace(c.spaceId, spaceId))
    }
    return list
  }, [
    selectedTab,
    connectors,
    scope,
    spaceId,
    getAppConnectors,
    getApiConnectors,
    getMcpConnectors,
  ])

  // --- Sub-route helpers ------------------------------------------------
  const navigateToList = useCallback(() => {
    navigate(`${location.pathname}#settings/connectors`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToAdd = useCallback(() => {
    navigate(`${location.pathname}#settings/connectors/add`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToConnector = useCallback(
    (connectorId: string) => {
      navigate(`${location.pathname}#settings/connectors/${connectorId}`, {
        replace: true,
      })
    },
    [navigate, location.pathname],
  )

  // --- Handlers ---------------------------------------------------------
  const handleDisconnect = async (connectorId: string) => {
    await deleteConnector(connectorId)
    navigateToList()
  }

  // Redirect to add wizard when no connectors exist
  useEffect(() => {
    if (
      isInitialized &&
      !isLoading &&
      currentConnectors.length === 0 &&
      !activeElement
    ) {
      navigateToAdd()
    }
  }, [
    isInitialized,
    isLoading,
    currentConnectors.length,
    activeElement,
    navigateToAdd,
  ])

  // --- Sub-route: /new  (wizard) ----------------------------------------
  if (activeElement === 'add') {
    if (selectedTab === 'mcp') {
      return (
        <div data-testid="connectors-settings">
          <CustomMcpWizard
            isOpen
            onClose={() => {
              setShowMcpWizard(false)
              navigateToList()
            }}
          />
        </div>
      )
    }
    return (
      <div data-testid="connectors-settings">
        <ConnectorWizardInline
          category={selectedTab}
          initialProvider={null}
          onClose={navigateToList}
        />
      </div>
    )
  }

  // --- Sub-route: /:connectorId  (settings) ----------------------------
  if (activeElement) {
    const connector = getConnector(activeElement)

    if (!connector) {
      // Unknown connector id — fall back to list
      return (
        <div data-testid="connectors-settings">
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <Icon name="WarningTriangle" className="w-8 h-8 text-warning" />
            <p className="text-default-500 text-sm">
              {t('Connector not found')}
            </p>
            <Button size="sm" variant="flat" onPress={navigateToList}>
              {t('Back to connectors')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div data-testid="connectors-settings">
        <ConnectorSettingsInline
          connector={connector}
          onClose={navigateToList}
          onDisconnect={handleDisconnect}
        />
      </div>
    )
  }

  // --- Default sub-route: list view ------------------------------------
  return (
    <div data-testid="connectors-settings">
      <Tabs
        aria-label={t('Connector type')}
        size="sm"
        selectedKey={selectedTab}
        onSelectionChange={(k) => setSelectedTab(k as ConnectorCategory)}
        className="mb-6"
      >
        <Tab key="app" title={t('Apps')} />
        <Tab key="mcp" title={t('MCP server')} />
      </Tabs>

      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-default-500 text-sm">
          {selectedTab === 'mcp'
            ? t('Connect a remote MCP server to give your agents its tools.')
            : t('Sync files and data from your favorite apps and services.')}
        </p>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {isLoading && !isInitialized ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : currentConnectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Icon name="Server" className="w-8 h-8 text-default-300" />
            <p className="text-default-500 text-sm">
              {selectedTab === 'mcp'
                ? t('No MCP servers connected yet.')
                : t('No connectors yet.')}
            </p>
            <Button
              color="primary"
              size="sm"
              variant="flat"
              startContent={<Icon name="Plus" className="w-4 h-4" />}
              onPress={navigateToAdd}
            >
              {selectedTab === 'mcp' ? t('Add MCP server') : t('Add Connector')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {currentConnectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onClick={() => navigateToConnector(connector.id)}
              />
            ))}

            <Button
              color="primary"
              size="sm"
              variant="flat"
              startContent={<Icon name="Plus" className="w-4 h-4" />}
              onPress={navigateToAdd}
            >
              {t('Add Connector')}
            </Button>
          </div>
        )}

        {/* Rendered outside the empty/populated branches: with no connectors this
            section redirects straight to the add wizard, so a card parked inside
            the populated grid was never visible to a new user - which is the only
            user who needs to see it. */}

            {/* Composio is advertised here but not wired: there is no client code
                and no gateway route for it (config has it as
                'planned-server-side'). Shown as a disabled card with a reason
                rather than a button that does nothing. */}
            <div
              className="border-dashed border-divider text-default-400 flex flex-col items-start gap-1 rounded-xl border p-4"
              aria-disabled="true"
            >
              <div className="flex items-center gap-2">
                <Icon name="EvPlug" className="w-4 h-4" />
                <span className="text-sm font-medium">Composio</span>
                <span className="bg-default-100 text-default-500 dark:bg-default-100/50 rounded-full px-2 py-0.5 text-xs">
                  {t('Coming soon')}
                </span>
              </div>
              <p className="text-xs">
                {t(
                  'One connection to hundreds of apps. Needs a server-side integration before it can be enabled.',
                )}
              </p>
            </div>
      </div>
    </div>
  )
}
