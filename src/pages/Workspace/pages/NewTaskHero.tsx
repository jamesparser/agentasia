import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  ScrollShadow,
} from '@heroui/react'
import { Icon, PromptArea, Title } from '@/components'
import { DevsIcon } from '@/components/DevsIcon'
import { AGENTASIA } from '@/config/agentasia'
import { useDraftPrompt } from '@/hooks/useDraftPrompt'
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt'
import type { PromptMode } from '@/components/PromptArea'
import { useI18n, useUrl } from '@/i18n'
import { useSessionStore } from '@/stores/sessionStore'
import { getAgentsByCategory } from '@/stores/agentStore'
import { errorToast } from '@/lib/toast'
import { uuidToBase64url } from '@/lib/url'
import type { Agent, InstalledSkill, SessionIntent } from '@/types'
import { userSettings } from '@/stores/userStore'
import { PRODUCT } from '@/config/product'
import { navigateWithTransition } from '@/lib/navigation-transition'

export interface NewTaskHeroProps {
  /** When true the PromptArea receives autofocus. Default: true. */
  autoFocus?: boolean
  /** Show the category use-case dropdowns. Default: true. */
  className?: string
  /**
   * Externally controlled prompt value. When provided, the internal prompt
   * state is overridden — useful for tours, demos, or controlled playback.
   */
  value?: string
  /** Called when the internal prompt state changes. */
  onValueChange?: (value: string) => void
  /**
   * When true, skips loading real agents and LLM providers. Use in product
   * tours or other purely visual contexts where live data is not needed.
   */
  demo?: boolean
}

/** Map session intent to V2 filter for navigation */
const intentToFilter = (_intent: SessionIntent): string => {
  return 'tasks'
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })

/**
 * Shared hero block for the DEVS home page — the DEVS logo, product title,
 * prompt composer, and use-case category dropdowns.
 *
 * Self-contained: owns all of its state and side-effects (session creation,
 * navigation). Both the real NewTaskPage and the product tour render this
 * component so there is a single source of truth — visual tweaks flow through
 * automatically.
 */
export function NewTaskHero({
  autoFocus = true,
  className,
  value,
  onValueChange,
  demo = false,
}: NewTaskHeroProps) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()

  /* The install prompt lived only in src/pages/Index, which is not routed - so
     nothing ever offered to install the app, despite the manifest, icons and
     service worker all being in place. This hero is the page visitors actually
     land on, and it is the page a phone browser shows the prompt on. */
  usePWAInstallPrompt({
    title: t('Install AgentAsia'),
    description: t(
      'Install this app on your device for a better experience and offline access.',
    ),
  })

  // The composer on the landing page and the new-task route. Uncontrolled here,
  // so without a draft store the text is gone the moment you open another
  // agent; keyed by the thread in the URL when there is one.
  const { threadId: draftThreadId } = useParams<{ threadId?: string }>()
  const [internalPrompt, setInternalPrompt] = useDraftPrompt(
    draftThreadId ?? 'new-task',
  )
  const prompt = value !== undefined ? value : internalPrompt
  const setPrompt = (next: string) => {
    if (value === undefined) setInternalPrompt(next)
    onValueChange?.(next)
  }
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [mode, setMode] = useState<PromptMode>('chat')
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(true)

  const { createSession } = useSessionStore()
  const { platformName } = userSettings()

  useEffect(() => {
    if (demo) {
      setIsLoadingAgents(false)
      return
    }
    let cancelled = false
    const loadData = async () => {
      try {
        setIsLoadingAgents(true)
        const { agentsByCategory, orderedCategories } =
          await getAgentsByCategory(lang, { includeDefaultAgents: true })
        if (cancelled) return
        const allAgents = orderedCategories.flatMap(
          (category) => agentsByCategory[category] || [],
        )
        setAgents(allAgents.filter((agent) => agent.id !== 'devs'))
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        if (!cancelled) setIsLoadingAgents(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [lang, demo])

  const handleUseCaseClick = useCallback(
    (
      useCase: {
        prompt: string
        id: string
        title?: string
        agent: Agent
      },
      focus = true,
    ) => {
      if (useCase.agent) setSelectedAgent(useCase.agent)
      setPrompt(
        useCase.agent.i18n?.[lang]?.examples?.find((ex) => ex.id === useCase.id)
          ?.prompt ?? useCase.prompt,
      )
      if (focus) {
        ;(
          document.querySelector('[data-testid="prompt-input"]') as any
        )?.focus()
      }
    },
    [lang],
  )

  const onSubmitToAgent = useCallback(
    async (
      cleanedPrompt?: string,
      mentionedAgent?: Agent,
      _mentionedMethodology?: unknown,
      mentionedSkills?: InstalledSkill[],
      mentionedConnectors?: Array<{
        id: string
        name: string
        provider: string
        accountEmail?: string
      }>,
    ) => {
      const promptToUse = cleanedPrompt ?? prompt
      if (!promptToUse.trim() || isSending) return

      setIsSending(true)

      try {
        const agent = mentionedAgent ||
          selectedAgent || { id: 'devs', slug: 'devs' }

        let intent: SessionIntent
        if (mode === 'studio') intent = 'media'
        else if (mode === 'app') intent = 'app'
        else if (mode === 'agent') intent = 'agent'
        else if (agent.id === 'devs') intent = 'task'
        else intent = 'chat'

        const attachments =
          selectedFiles.length > 0
            ? await Promise.all(
                selectedFiles.map(async (file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  data: await fileToBase64(file),
                })),
              )
            : undefined

        const session = await createSession({
          prompt: promptToUse,
          intent,
          primaryAgentId: agent.id,
          attachments,
          mentionedSkills: mentionedSkills?.map((s) => s.name),
          mentionedConnectors: mentionedConnectors?.map((c) => c.name),
        })

        sessionStorage.removeItem('pendingPrompt')
        sessionStorage.removeItem('pendingAgent')
        sessionStorage.removeItem('pendingFiles')
        sessionStorage.removeItem('pendingSkills')
        sessionStorage.removeItem('pendingConnectors')

        const targetUrl = url(`/${intentToFilter(intent)}/${uuidToBase64url(session.id)}`)
        navigateWithTransition(() => navigate(targetUrl))

        setPrompt('')
        setSelectedFiles([])
        setMode('chat')
      } catch (error) {
        console.error('Failed to create session:', error)
        errorToast('Failed to create session', error)
      } finally {
        setIsSending(false)
      }
    },
    [
      prompt,
      isSending,
      selectedAgent,
      selectedFiles,
      mode,
      createSession,
      navigate,
      url,
    ],
  )

  const onSubmitTask = useCallback(
    async (
      cleanedPrompt?: string,
      mentionedAgent?: Agent,
      _mentionedMethodology?: unknown,
      mentionedSkills?: InstalledSkill[],
      mentionedConnectors?: Array<{
        id: string
        name: string
        provider: string
        accountEmail?: string
      }>,
    ) => {
      const promptToUse = cleanedPrompt ?? prompt
      if (!promptToUse.trim() || isSending) return

      setIsSending(true)

      try {
        const agent = mentionedAgent ||
          selectedAgent || { id: 'devs', slug: 'devs' }

        let intent: SessionIntent
        if (mode === 'studio') intent = 'media'
        else if (mode === 'app') intent = 'app'
        else if (mode === 'agent') intent = 'agent'
        else if (agent.id !== 'devs') intent = 'chat'
        else intent = 'task'

        const attachments =
          selectedFiles.length > 0
            ? await Promise.all(
                selectedFiles.map(async (file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  data: await fileToBase64(file),
                })),
              )
            : undefined

        const session = await createSession({
          prompt: promptToUse,
          intent,
          primaryAgentId: agent.id,
          attachments,
          mentionedSkills: mentionedSkills?.map((s) => s.name),
          mentionedConnectors: mentionedConnectors?.map((c) => c.name),
        })

        sessionStorage.removeItem('pendingPrompt')
        sessionStorage.removeItem('pendingAgent')
        sessionStorage.removeItem('pendingFiles')
        sessionStorage.removeItem('pendingSkills')
        sessionStorage.removeItem('pendingConnectors')

        const targetUrl = url(`/${intentToFilter(intent)}/${uuidToBase64url(session.id)}`)
        navigateWithTransition(() => navigate(targetUrl))

        setPrompt('')
        setSelectedFiles([])
        setMode('chat')
      } catch (error) {
        console.error('Failed to create session:', error)
        errorToast('Failed to create session', error)
      } finally {
        setIsSending(false)
      }
    },
    [
      prompt,
      isSending,
      selectedAgent,
      selectedFiles,
      mode,
      createSession,
      navigate,
      url,
    ],
  )

  return (
    <div className={className ?? 'flex h-full min-h-0 flex-1 flex-col'}>
      <ScrollShadow
        hideScrollBar
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-16">
          <DevsIcon size="6xl" className="opacity-50" />

          <Title
            subtitle={AGENTASIA.slogan}
            className="!text-2xl text-center sm:!text-3xl md:!text-4xl font-light"
            subtitleClassName="text-md md:text-xl text-center"
          >
            {platformName || PRODUCT.displayName}
          </Title>

          {/* PromptArea */}
          <div className="w-full max-w-2xl">
            <PromptArea
              lang={lang}
              autoFocus={autoFocus}
              className="mb-8"
              value={prompt}
              defaultPrompt={prompt}
              onValueChange={setPrompt}
              onSubmitToAgent={onSubmitToAgent}
              onSubmitTask={onSubmitTask}
              isSending={isSending}
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              onFilesChange={setSelectedFiles}
              mode={mode}
              onModeChange={setMode}
              demo={demo}
            />
          </div>

        </div>
      </ScrollShadow>
    </div>
  )
}
