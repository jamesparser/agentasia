import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Input,
  Tabs,
  Tab,
  Breadcrumbs,
  BreadcrumbItem,
} from '@heroui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { SecureStorage } from '@/lib/crypto'
import { Icon } from '@/components'
import { errorToast, successToast } from '@/lib/toast'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from './i18n'
import {
  SettingsProvider,
  useSettingsLabelInfo,
  useSettingsScope,
  useSetSettingsScope,
  type SettingsScope,
} from './SettingsContext'
import { useActiveSpace, useActiveSpaceId } from '@/stores/spaceStore'
import { ALL_SPACES_ID, DEFAULT_SPACE_ID } from '@/types'
import {
  AgentMemoriesSection,
  ConnectorsSection,
  DeviceSection,
  FeaturesSection,
  GeneralSection,
  LangfuseSection,
  LocalBackupSection,
  PinnedMessagesSection,
  ProvidersSection,
  SecuritySection,
  SkillsSection,
  SpaceSection,
  SyncSection,
  TagsSection,
  TracesSection,
  UsageSection,
  VoiceSection,
  SubscriptionSection,
  ScheduledTasksSection,
} from './components'
import { FilesSection } from '@/pages/Knowledge/components'
import { IconName } from '@/lib/types'

type SectionKey =
  | ''
  | 'space'
  | 'providers'
  | 'connectors'
  | 'features'
  | 'voice'
  | 'skills'
  | 'knowledge'
  | 'memories'
  | 'messages'
  | 'tags'
  | 'security'
  | 'computer'
  | 'langfuse'
  | 'traces'
  | 'database'
  | 'local-backup'
  | 'sync'
  | 'subscription'
  | 'scheduled-tasks'

type SectionGroup =
  | 'configure'
  | 'personalize'
  | 'extend'
  | 'preserve'
  | 'observe'

interface SectionDef {
  key: SectionKey
  label: string
  icon: IconName
  group: SectionGroup
  navigateTo?: string
}

interface SectionGroupDef {
  key: SectionGroup
  label: string
}

interface SettingsContentProps {
  isModal?: boolean
}

export const SettingsContent = (_props: SettingsContentProps) => {
  return (
    <SettingsProvider>
      <SettingsContentInner />
    </SettingsProvider>
  )
}

const SettingsContentInner = () => {
  const { t } = useI18n(localI18n)
  const labelInfo = useSettingsLabelInfo()
  const navigate = useNavigate()
  const location = useLocation()

  const scope = useSettingsScope()
  const setScope = useSetSettingsScope()
  const activeSpaceId = useActiveSpaceId()
  const activeSpace = useActiveSpace()
  const isNonDefaultSpace =
    activeSpaceId !== DEFAULT_SPACE_ID && activeSpaceId !== ALL_SPACES_ID

  const [masterPassword, setMasterPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  // Force settings back to global scope whenever the space-scope toggle
  // is not applicable (default space or "All spaces" view).
  useEffect(() => {
    if (!isNonDefaultSpace && scope !== 'global') {
      setScope('global')
    }
  }, [isNonDefaultSpace, scope, setScope])

  // All section keys for hash matching
  const allSectionKeys: SectionKey[] = [
    '',
    'space',
    'providers',
    'connectors',
    'features',
    'voice',
    'skills',
    'knowledge',
    'memories',
    'messages',
    'tags',
    'security',
    'computer',
    'langfuse',
    'traces',
    'database',
    'local-backup',
    'sync',
    'subscription',
    'scheduled-tasks',
  ]

  // Use the hash highlight hook for element-level deep linking
  // Hash format: #page/section or #page/section/element
  const { activeSection, activeElement } = useHashHighlight()

  // Active section in the sidebar
  const [activeKey, setActiveKey] = useState<SectionKey>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Sync active section with URL hash
  useEffect(() => {
    if (activeSection && allSectionKeys.includes(activeSection as SectionKey)) {
      setActiveKey(activeSection as SectionKey)
    }
  }, [activeSection])

  // Group definitions for the sidebar menu
  const groups: SectionGroupDef[] = [
    { key: 'configure', label: t('Configure') },
    { key: 'personalize', label: t('Personalize') },
    { key: 'extend', label: t('Extend') },
    { key: 'preserve', label: t('Preserve') },
    { key: 'observe', label: t('Observe') },
  ]

  // Section definitions for the sidebar menu
  const sections: SectionDef[] = [
    {
      key: '',
      label: t('Settings'),
      icon: 'Settings',
      group: 'configure',
    },
    // Space section — only shown for non-default spaces
    ...(isNonDefaultSpace
      ? [
          {
            key: 'space' as SectionKey,
            label: activeSpace.name,
            icon: (activeSpace.icon ?? 'Cube') as IconName,
            group: 'configure' as SectionGroup,
          },
        ]
      : []),
    // AgentAsia: AI Providers is hidden. Plan -> model is decided server-side by
    // the gateway (see src/config/agentasia.ts), so exposing provider keys here
    // would offer a setting the product deliberately does not have, and would
    // invite a judge to paste a key into a demo they should not configure.
    { key: 'features', label: t('Features'), icon: 'Cube', group: 'configure' },
    { key: 'voice', label: t('Voice'), icon: 'Voice', group: 'configure' },
    {
      key: 'knowledge',
      label: t('Files'),
      icon: 'Document',
      group: 'personalize',
    },
    {
      key: 'memories',
      label: t('Memory'),
      icon: 'Brain',
      group: 'personalize',
    },
    {
      key: 'messages',
      label: t('Messages'),
      icon: 'Pin',
      group: 'personalize',
    },
    {
      key: 'tags',
      label: t('Tags'),
      icon: 'Label',
      group: 'personalize',
    },
    { key: 'skills', label: t('Skills'), icon: 'Puzzle', group: 'extend' },
    {
      key: 'connectors',
      label: t('Connectors'),
      icon: 'EvPlug',
      group: 'extend',
    },
    {
      key: 'scheduled-tasks',
      label: t('Scheduled Tasks'),
      icon: 'ClockRotateRight',
      group: 'extend',
    },
    // { key: 'security', label: t('Secure Storage'), icon: 'Lock', group: 'configure' },
    {
      key: 'local-backup',
      label: t('Local Backup'),
      icon: 'FloppyDisk',
      group: 'preserve',
    },
    {
      key: 'sync',
      label: t('Sync'),
      icon: 'CloudSync',
      group: 'preserve',
    },
    { key: 'computer', label: t('Device'), icon: 'Computer', group: 'observe' },
    // { key: 'langfuse', label: 'Langfuse', icon: 'Langfuse', group: 'observe' },
    { key: 'traces', label: t('Usage'), icon: 'Activity', group: 'observe' },
    {
      key: 'subscription',
      label: t('Subscription'),
      icon: 'CreditCard',
      group: 'observe',
    },
  ]

  // Sections where space-level overrides make sense (synced settings)
  const spaceScopableSections = new Set<SectionKey>([
    '',
    'features',
    'tags',
    'connectors',
    'providers',
    'skills',
  ])

  const handleSectionClick = (section: SectionDef) => {
    if (section.navigateTo) {
      navigate(section.navigateTo)
      return
    }
    setActiveKey(section.key)
    navigate(
      `${location.pathname}#settings${section.key ?? `/${section.key}`}`,
      { replace: true },
    )
  }

  useEffect(() => {
    SecureStorage.init()
  }, [])

  const handleUnlock = async () => {
    if (!masterPassword) return

    setIsUnlocking(true)
    try {
      SecureStorage.unlock(masterPassword)
      setMasterPassword('')
      successToast(t('Storage unlocked'))
    } catch (error) {
      errorToast(t('Invalid password'))
    } finally {
      setIsUnlocking(false)
    }
  }

  // Render section content based on the active key
  const renderSectionContent = () => {
    switch (activeKey) {
      case '':
        return <GeneralSection />
      case 'space':
        return <SpaceSection />
      case 'providers':
        return <ProvidersSection />
      case 'connectors':
        return <ConnectorsSection />
      case 'voice':
        return <VoiceSection />
      case 'features':
        return <FeaturesSection />
      case 'skills':
        return <SkillsSection />
      case 'knowledge':
        return <FilesSection />
      case 'memories':
        return <AgentMemoriesSection />
      case 'messages':
        return <PinnedMessagesSection />
      case 'tags':
        return <TagsSection />
      case 'security':
        return <SecuritySection />
      case 'computer':
        return (
          <div data-testid="computer-settings">
            <DeviceSection />
          </div>
        )
      case 'langfuse':
        return <LangfuseSection />
      case 'traces':
        // Labelled "Usage": the plan and what is left this month come first, the
        // raw execution traces stay underneath for debugging an orchestration.
        return (
          <div className="flex flex-col gap-8">
            <UsageSection />
            <TracesSection />
          </div>
        )
      case 'subscription':
        return <SubscriptionSection />
      case 'scheduled-tasks':
        return <ScheduledTasksSection />
      case 'local-backup':
        return <LocalBackupSection />
      case 'sync':
        return <SyncSection />
      default:
        return null
    }
  }

  // Find the current section definition
  const currentSection = sections.find((s) => s.key === activeKey)

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0">
      {/* Phones: one big tap target showing the current section; it opens a
          grouped list of full-height rows (the old strip of tiny icon tabs was
          too small to hit). */}
      <div className="md:hidden sticky top-0 z-20 shrink-0 border-b border-default-200 bg-content1">
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="flex min-h-12 w-full items-center gap-3 py-3 ps-4 pe-16 text-start"
        >
          <Icon
            name={(currentSection?.icon ?? 'Settings') as any}
            className="h-5 w-5 shrink-0"
          />
          <span className="flex-1 truncate text-base font-medium">
            {currentSection?.label ?? t('Settings')}
          </span>
          <Icon
            name="NavArrowDown"
            className={`h-5 w-5 shrink-0 text-default-500 transition-transform ${
              mobileMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {mobileMenuOpen && (
          <div className="max-h-[60vh] overflow-y-auto border-t border-default-200 pb-2">
            {groups.map((group) => {
              const groupSections = sections.filter((s) => s.group === group.key)
              if (groupSections.length === 0) return null
              return (
                <div key={group.key}>
                  <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-default-400">
                    {group.label}
                  </h3>
                  {groupSections.map((section) => {
                    const isActive = activeKey === section.key
                    return (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          handleSectionClick(section)
                        }}
                        className={`flex min-h-12 w-full items-center gap-3 px-4 py-3 text-start text-base ${
                          isActive ? 'bg-default-200 font-medium' : 'active:bg-default-100'
                        }`}
                      >
                        <Icon
                          name={section.icon as any}
                          className="h-5 w-5 shrink-0"
                        />
                        <span className="flex-1 truncate">{section.label}</span>
                        {!!section.navigateTo && (
                          <Icon
                            name="ArrowRight"
                            className="h-4 w-4 shrink-0 text-default-400 rtl:rotate-180"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Left sidebar menu (hidden on narrow screens) */}
      <nav className="hidden md:block max-w-48 shrink-0 border-e border-default-200 overflow-x-hidden overflow-y-auto bg-[var(--devs-bg)] dark:bg-default-50">
        <h2 className="text-lg font-medium px-4 py-4">{t('Settings')}</h2>
        <div className="flex flex-col gap-4 px-2 pb-4">
          {groups.map((group) => {
            const groupSections = sections.filter((s) => s.group === group.key)
            if (groupSections.length === 0) return null
            return (
              <div key={group.key}>
                <h3 className="text-xs font-semibold text-default-400 uppercase tracking-wider px-3 mb-1">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {groupSections.map((section) => {
                    const isActive = activeKey === section.key
                    const isExternal = !!section.navigateTo
                    return (
                      <li key={section.key}>
                        <button
                          type="button"
                          onClick={() => handleSectionClick(section)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-start ${
                            isActive
                              ? 'bg-default-200 font-medium'
                              : 'text-default-600 hover:bg-default-100'
                          }`}
                        >
                          <Icon
                            name={section.icon as any}
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="truncate">{section.label}</span>
                          {isExternal && (
                            <Icon
                              name="ArrowRight"
                              className="h-3 w-3 ms-auto shrink-0 text-default-400 rtl:rotate-180"
                            />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Right content panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Locked banner */}
        {SecureStorage.isLocked() && (
          <div className="px-6 pt-4">
            <Card>
              <CardBody className="flex flex-row items-center gap-4">
                <Icon name="Lock" className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {t('Secure storage is locked')}
                  </p>
                  <p className="text-xs text-default-500">
                    {t('Enter your master password to unlock')}
                  </p>
                </div>
                <Input
                  type="password"
                  placeholder={t('Master password')}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="w-48"
                />
                <Button
                  color="primary"
                  size="sm"
                  onPress={handleUnlock}
                  isLoading={isUnlocking}
                >
                  {t('Unlock')}
                </Button>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Section header + content */}
        {currentSection && !currentSection.navigateTo && (
          <div className="px-6 py-4 h-full">
            <h3 className="mb-1 flex items-center gap-2">
              {/* {activeElement && (
                  <button
                    type="button"
                    className="text-default-500 hover:text-default-800 transition-colors"
                  >
                    <Icon name="NavArrowLeft" className="h-5 w-5" />
                  </button>
                )} */}
              <Breadcrumbs size="lg" className="font-semibold">
                <BreadcrumbItem
                  onClick={() => {
                    if (!activeElement) return

                    // Navigate one level up: remove last segment from element
                    const segments = activeElement.split('/')
                    const parentElement =
                      segments.length > 1
                        ? segments.slice(0, -1).join('/')
                        : null
                    const parentHash = parentElement
                      ? `#settings/${currentSection.key}/${parentElement}`
                      : `#settings/${currentSection.key}`
                    navigate(`${location.pathname}${parentHash}`, {
                      replace: true,
                    })
                  }}
                >
                  {currentSection.label}
                </BreadcrumbItem>

                {labelInfo && (
                  <BreadcrumbItem>
                    {labelInfo.icon && (
                      <Icon
                        name={labelInfo.icon}
                        size="sm"
                        className="me-1 inline"
                      />
                    )}
                    {labelInfo.label}
                  </BreadcrumbItem>
                )}
              </Breadcrumbs>
            </h3>
            {isNonDefaultSpace && spaceScopableSections.has(activeKey) && (
              <div className="mt-2 mb-1">
                <Tabs
                  selectedKey={scope}
                  onSelectionChange={(key) => setScope(key as SettingsScope)}
                  variant="underlined"
                  size="sm"
                  classNames={{ tabList: 'gap-3 p-0' }}
                >
                  <Tab
                    key="global"
                    title={
                      <span className="flex items-center gap-1.5">
                        <Icon name="Globe" className="h-3.5 w-3.5" />
                        {t('Global')}
                      </span>
                    }
                  />
                  <Tab
                    key="space"
                    title={
                      <span className="flex items-center gap-1.5">
                        <Icon name="Cube" className="h-3.5 w-3.5" />
                        {activeSpace.name}
                      </span>
                    }
                  />
                </Tabs>
              </div>
            )}
            <div className="mt-4">{renderSectionContent()}</div>
          </div>
        )}
      </div>
    </div>
  )
}
