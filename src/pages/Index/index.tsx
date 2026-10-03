import { useI18n, useUrl } from '@/i18n'
import { useDraftPrompt } from '@/hooks/useDraftPrompt'
import { Icon, PromptArea, Section, Title } from '@/components'
import type { PromptMode } from '@/components/PromptArea'
import { DevsIcon } from '@/components/DevsIcon'
import { AGENTASIA } from '@/config/agentasia'
import { openInfoDialog } from '@/components/InfoDialog'
import { EasySetupModal } from '@/components/EasySetup/EasySetupModal'
import DefaultLayout from '@/layouts/Default'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent, InstalledSkill, SessionIntent } from '@/types'
import { useSessionStore } from '@/stores/sessionStore'
import { errorToast } from '@/lib/toast'
import { useBackgroundImage } from '@/hooks/useBackgroundImage'
import { useEasySetup } from '@/hooks/useEasySetup'
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt'
import {
  Alert,
  Link,
} from '@heroui/react'
import { motion } from 'framer-motion'
import { motionVariants } from './motion'
// import { loadAllMethodologies } from '@/stores/methodologiesStore'
// import type { Methodology } from '@/types/methodology.types'
import localeI18n from './i18n'
import { PRODUCT } from '@/config/product'
import { userSettings } from '@/stores/userStore'
import { RecentActivity } from './RecentActivity'
import { navigateWithTransition } from '@/lib/navigation-transition'

export const IndexPage = () => {
  const { lang, t } = useI18n(localeI18n)
  const { t: tMain } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const [prompt, setPrompt] = useDraftPrompt('new-task')
  const [isSending, setIsSending] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [mode, setMode] = useState<PromptMode>('chat')
  // const [methodologies, setMethodologies] = useState<Methodology[]>([])
  // const [isLoadingMethodologies, setIsLoadingMethodologies] = useState(true)

  const { createSession } = useSessionStore()
  const { backgroundImage, backgroundLoaded, isDragOver, dragHandlers } =
    useBackgroundImage()
  const { hasSetupData, setupData, clearSetupData } = useEasySetup()

  const { platformName } = userSettings()
  const productName = platformName ?? PRODUCT.displayName

  // PWA install prompt
  usePWAInstallPrompt({
    title: t('Install {productName}', { productName }),
    description: t(
      'Install this app on your device for a better experience and offline access.',
    ),
  })


  // useEffect(() => {
  //   const loadData = async () => {
  //     try {
  //       setIsLoadingMethodologies(true)
  //       const data = await loadAllMethodologies()
  //       setMethodologies(data)
  //     } catch (error) {
  //       console.error('Failed to load methodologies:', error)
  //     } finally {
  //       setIsLoadingMethodologies(false)
  //     }
  //   }
  //   loadData()
  // }, [lang])

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (data:mime/type;base64,)
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
    })
  }


  const onSubmitToAgent = async (
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

      // Determine intent from explicit mode signals
      let intent: SessionIntent
      if (mode === 'studio') intent = 'media'
      else if (mode === 'app') intent = 'app'
      else if (mode === 'agent') intent = 'agent'
      else if (agent.id === 'devs') intent = 'task'
      else intent = 'chat'

      // Convert files to session attachments
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

      // Create a session entity
      const session = await createSession({
        prompt: promptToUse,
        intent,
        primaryAgentId: agent.id,
        attachments,
        mentionedSkills: mentionedSkills?.map((s) => s.name),
        mentionedConnectors: mentionedConnectors?.map((c) => c.name),
      })

      // Clear any stale pending data — the Session pipeline handles execution now,
      // so we must not leave prompts that the legacy agents/run page would pick up.
      sessionStorage.removeItem('pendingPrompt')
      sessionStorage.removeItem('pendingAgent')
      sessionStorage.removeItem('pendingFiles')
      sessionStorage.removeItem('pendingSkills')
      sessionStorage.removeItem('pendingConnectors')

      // Navigate with View Transition
      const targetUrl = url(`/session/${session.id}`)
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
  }

  const onSubmitTask = async (
    cleanedPrompt?: string,
    mentionedAgent?: Agent,
  ) => {
    const promptToUse = cleanedPrompt ?? prompt
    if (!promptToUse.trim() || isSending) return

    setIsSending(true)

    try {
      const agent = mentionedAgent ||
        selectedAgent || { id: 'devs', slug: 'devs' }

      // Convert files to session attachments
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

      // Determine intent
      let intent: SessionIntent
      if (mode === 'studio') intent = 'media'
      else if (mode === 'app') intent = 'app'
      else if (mode === 'agent') intent = 'agent'
      else intent = 'task'

      // Create session
      const session = await createSession({
        prompt: promptToUse,
        intent,
        primaryAgentId: agent.id,
        attachments,
      })

      // Clear any stale pending data — the Session pipeline handles execution now.
      sessionStorage.removeItem('pendingPrompt')
      sessionStorage.removeItem('pendingAgent')
      sessionStorage.removeItem('pendingFiles')
      sessionStorage.removeItem('pendingSkills')
      sessionStorage.removeItem('pendingConnectors')

      // Navigate with View Transition
      const targetUrl = url(`/session/${session.id}`)
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
  }

  return (
    <div
      className="relative min-h-full"
      onDragEnter={dragHandlers.onDragEnter}
      onDragLeave={dragHandlers.onDragLeave}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      <DefaultLayout showBackButton={false}>
        {/* Background Image */}
        {backgroundImage && (
          <div
            className={`absolute m-0 inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
              backgroundLoaded ? 'opacity-25 dark:opacity-40' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${backgroundImage})`,
            }}
          />
        )}
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute top-auto bottom-2 inset-0 flex items-center justify-center">
            <div>
              <Alert
                variant="faded"
                title={t('Drop your image here')}
                description={t('Release to set as background')}
              />
            </div>
          </div>
        )}

        <Section mainClassName="section-blank">
          <motion.div
            layoutId="active"
            className="flex flex-col text-center items-center mt-0 sm:mt-[10vh]"
            {...motionVariants.container}
          >
            <motion.div {...motionVariants.icon}>
              <DevsIcon />
            </motion.div>

            <motion.div {...motionVariants.title}>
              <Title
                subtitle={tMain(AGENTASIA.slogan)}
                className="!text-2xl sm:!text-3xl md:!text-4xl font-light"
                subtitleClassName="text-md md:text-xl"
              >
                {platformName ||
                  t('Hey {productName}', { productName: PRODUCT.displayName })}
              </Title>
            </motion.div>
          </motion.div>

          <motion.div {...motionVariants.promptArea}>
            <PromptArea
              lang={lang}
              autoFocus
              className="my-8 sm:my-16"
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
            />
          </motion.div>


          <motion.div {...motionVariants.agentSection}>
            <RecentActivity />
          </motion.div>
        </Section>

        <footer className="absolute bottom-12 md:bottom-0 left-0 right-0 mt-auto py-6 flex justify-center gap-4 scale-90 text-sm *:text-default-400 dark:*:text-default-500">
          <Link
            href={url('/info')}
            onClick={(e: { preventDefault: () => void }) => {
              e.preventDefault()
              openInfoDialog()
            }}
          >
            {t('About')}
          </Link>
          <Link href={url('/terms')}>{t('Terms')}</Link>
          <Link href={url('/privacy')}>{t('Privacy')}</Link>
          {/* Open Source */}
          <Link
            href="https://github.com/codename-co/devs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Icon name="GitHub" size="sm" className="me-1" />
            {t('Open Source')}
          </Link>
        </footer>
      </DefaultLayout>

      {hasSetupData && setupData && (
        <EasySetupModal
          isOpen={true}
          onClose={clearSetupData}
          setupData={setupData}
          onSetupComplete={clearSetupData}
        />
      )}
    </div>
  )
}
