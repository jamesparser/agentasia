import { Icon } from '@/components'
import { SignInDialog } from '@/components/auth/SignInDialog'
import { auth, useAuth } from '@/lib/auth'
import { AgentSelector } from '@/components/PromptArea/AgentSelector'
import { useI18n } from '@/i18n'
import localI18n from '../i18n'
import { useVoice } from '../hooks/useVoice'
import { getAvailableSTTProviders } from '../lib'
import DefaultLayout from '@/layouts/Default'
import { userSettings } from '@/stores/userStore'
import { getAgentBySlugAsync, getDefaultAgent } from '@/stores/agentStore'
import { useConversationStore } from '@/stores/conversationStore'
import { CredentialService } from '@/lib/credential-service'
import { LLMService, type LLMMessage } from '@/lib/llm'
import { buildAgentInstructions } from '@/lib/agent-knowledge'
import { buildMemoryContextForChat } from '@/lib/memory-learning-service'
import { languages } from '@/i18n'
import type { Agent, Message } from '@/types'
import {
  Button,
  Progress,
  Tooltip,
} from '@heroui/react'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSpeakAloud } from '@/lib/voice/useSpeakAloud'
import { useSearchStore } from '@/features/search/searchStore'
import { VoiceWaveform } from '../components'
import { NagaFace, useSpeechAmplitude, type NagaState } from '@/features/naga'

/** Sign in / account control, first in the Chat top menu. Hidden until auth is configured. */
function AccountMenuButton() {
  const { lang, t } = useI18n(localI18n)
  const { user, isSignedIn, isConfigured } = useAuth()
  const [showSignIn, setShowSignIn] = useState(false)
  if (!isConfigured) return null
  const loginText = lang === 'en' ? 'Log in' : t('Sign in')
  const logoutText = lang === 'en' ? 'Log out' : t('Sign out')
  const text = isSignedIn ? logoutText : loginText
  const hint = isSignedIn && user?.email ? `${text} (${user.email})` : text
  return (
    <>
      <button
        type="button"
        aria-label={hint}
        title={hint}
        onClick={() => {
          if (!isSignedIn) setShowSignIn(true)
          else void auth.signOut()
        }}
        className={
          'me-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-base font-medium transition-opacity hover:opacity-90 ' +
          (isSignedIn
            ? 'border border-default-300 bg-default-100 text-foreground'
            : 'bg-primary text-primary-foreground')
        }
      >
        <Icon name="User" size="sm" />
        <span>{text}</span>
      </button>
      <SignInDialog isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  )
}

export const LivePage = () => {
  const { lang, t, url } = useI18n(localI18n)
  const location = useLocation()
  const navigate = useNavigate()

  const {
    kokoroVoiceId,
    sttProvider: savedSTTProvider,
    ttsProvider: savedTTSProvider,
    liveAutoSpeak,
  } = userSettings()

  const [loadingProgress, setLoadingProgress] = useState<{
    status: string
    progress?: number
  } | null>(null)

  // Agent selection state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isAgentLoading, setIsAgentLoading] = useState(true)

  // Chat state
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [conversationMessages, setConversationMessages] = useState<Message[]>(
    [],
  )
  const conversationIdRef = useRef<string | null>(null)

  // Parse agent slug from URL hash
  const agentSlug = useMemo(() => {
    const hash = location.hash.replace('#', '')
    return hash || 'devs'
  }, [location.hash])

  // Load agent from slug
  useEffect(() => {
    const loadAgent = async () => {
      setIsAgentLoading(true)
      try {
        const agent = await getAgentBySlugAsync(agentSlug)
        if (agent) {
          setSelectedAgent(agent)
        } else {
          // Fallback to default agent
          setSelectedAgent(getDefaultAgent())
        }
      } catch (error) {
        console.error('Error loading agent:', error)
        setSelectedAgent(getDefaultAgent())
      } finally {
        setIsAgentLoading(false)
      }
    }
    loadAgent()
  }, [agentSlug])

  // Handle agent change - update URL hash
  const handleAgentChange = useCallback(
    (agent: Agent | null) => {
      if (agent) {
        setSelectedAgent(agent)
        navigate(`#${agent.slug}`, { replace: true })
        // Clear conversation when switching agents
        setConversationMessages([])
        conversationIdRef.current = null
        setAiResponse('')
      }
    },
    [navigate],
  )

  // Auto-speak setting (default to true)
  const autoSpeak = liveAutoSpeak ?? true

  // Selected Kokoro voice (default to am_adam: a male voice)
  const selectedVoiceId = kokoroVoiceId || 'am_adam'

  // Ref to store the pending transcript to submit
  const pendingTranscriptRef = useRef<string | null>(null)

  // Voice hook with configurable providers
  const {
    isRecording,
    isSpeaking,
    isSTTReady,
    isTTSReady,
    isLoading,
    transcript,
    error,
    toggleRecording,
    speak: speakModel,
    stopSpeaking: stopModel,
    setSTTProvider,
    setTTSProvider,
    sttProviderType,
    ttsProviderType,
    getTTSAnalyser,
  } = useVoice({
    sttProvider: savedSTTProvider || 'assemblyai', // Cloud speech to text: browser dictation is unreliable on phones
    // English: Kokoro's male voice (device voices expose no gender, so the browser
    // voice can come out female). Other languages use the device voice.
    ttsProvider: savedTTSProvider || (lang === 'en' ? 'kokoro' : 'web-speech'),
    ttsVoiceId: selectedVoiceId, // Use selected Kokoro voice
    language: lang,
    onLoadingProgress: (progress) => {
      setLoadingProgress(progress)
    },
    onFinalTranscript: (text) => {
      // Store the transcript to be processed after render
      if (text.trim()) {
        pendingTranscriptRef.current = text
      }
    },
    onError: (err) => {
      console.error('[Voice] Error:', err)
    },
  })

  // The male Kokoro model is a one-time download; until it is ready, read replies
  // with the device voice so the page is never silent.
  const device = useSpeakAloud(lang)
  const speak = async (text: string) => {
    if (isTTSReady) await speakModel(text)
    else device.speak(text)
  }
  const stopSpeaking = () => {
    stopModel()
    device.stop()
  }

  // TTS Analyser ref for waveform visualization during AI speech
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)

  // If the in-browser voice cannot start (no memory, blocked download), fall back
  // to the device voice instead of leaving the page silent.
  useEffect(() => {
    if (error && ttsProviderType === 'kokoro') void setTTSProvider('web-speech')
  }, [error, ttsProviderType, setTTSProvider])
  const nagaAmplitude = useSpeechAmplitude(isSpeaking, ttsAnalyserRef)
  const nagaState: NagaState = isSpeaking ? 'speaking' : isGenerating ? 'thinking' : isRecording ? 'listening' : 'idle'

  // Keep TTS analyser ref updated
  useEffect(() => {
    ttsAnalyserRef.current = getTTSAnalyser()
  }, [getTTSAnalyser, isSpeaking, isTTSReady])

  // Submit transcript to LLM for text generation
  const handleSubmitToLLM = useCallback(
    async (userMessage: string) => {
      if (!selectedAgent || isGenerating) return

      setIsGenerating(true)
      setAiResponse('')

      try {
        // Get the active LLM configuration
        const config = await CredentialService.getActiveConfig()
        if (!config) {
          console.error('No AI provider configured')
          setIsGenerating(false)
          return
        }

        // Get or create conversation
        const { currentConversation, createConversation, addMessage } =
          useConversationStore.getState()

        let conversation = currentConversation
        if (
          !conversation ||
          conversation.agentId !== selectedAgent.id ||
          conversationIdRef.current !== conversation.id
        ) {
          conversation = await createConversation(selectedAgent.id, 'live')
          conversationIdRef.current = conversation.id
        }

        // Build agent instructions
        const baseInstructions =
          selectedAgent.instructions || 'You are a helpful assistant.'
        const enhancedInstructions = await buildAgentInstructions(
          baseInstructions,
          selectedAgent.knowledgeItemIds,
        )

        // Get relevant memories
        const memoryContext = await buildMemoryContextForChat(
          selectedAgent.id,
          userMessage,
        )

        const instructions = [
          enhancedInstructions,
          memoryContext,
          `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
          `Keep your responses concise and conversational, suitable for voice interaction.`,
        ]
          .filter(Boolean)
          .join('\n\n')

        // Save user message
        await addMessage(conversation.id, {
          role: 'user',
          content: userMessage,
        })

        // Update local state
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        }
        setConversationMessages((prev) => [...prev, userMsg])

        // Prepare messages for LLM
        const messages: LLMMessage[] = [
          { role: 'system', content: instructions },
          ...conversationMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: 'user', content: userMessage },
        ]

        // Stream the response
        let response = ''
        for await (const chunk of LLMService.streamChat(messages, config, {
          agentId: selectedAgent.id,
          conversationId: conversation.id,
          tags: ['voice'],
        })) {
          response += chunk
          setAiResponse(response)
        }

        // Save assistant response
        await addMessage(conversation.id, {
          role: 'assistant',
          content: response,
          agentId: selectedAgent.id,
        })

        // Update local state
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          agentId: selectedAgent.id,
        }
        setConversationMessages((prev) => [...prev, assistantMsg])

        // Auto-speak the response if enabled
        if (autoSpeak && response) {
          // Strip markdown for speech
          const textToSpeak = response
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]+`/g, '') // Remove inline code
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic
            .replace(/#+\s/g, '') // Remove headers
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .trim()

          if (textToSpeak) {
            await speak(textToSpeak)
          }
        }
      } catch (error) {
        console.error('Error generating response:', error)
      } finally {
        setIsGenerating(false)
      }
    },
    [
      selectedAgent,
      isGenerating,
      conversationMessages,
      lang,
      autoSpeak,
      isTTSReady,
      speak,
    ],
  )

  // Process pending transcript when agent is ready
  useEffect(() => {
    if (
      pendingTranscriptRef.current &&
      selectedAgent &&
      !isGenerating &&
      !isAgentLoading
    ) {
      const text = pendingTranscriptRef.current
      pendingTranscriptRef.current = null
      handleSubmitToLLM(text)
    }
  }, [selectedAgent, isGenerating, isAgentLoading, handleSubmitToLLM])

  // Available providers
  const sttProviders = useMemo(
    () => getAvailableSTTProviders(lang, (key: string) => t(key as any)),
    [lang, t],
  )

  // If current STT provider is disabled, switch to the first available non-disabled provider
  useEffect(() => {
    const currentProvider = sttProviders.find((p) => p.type === sttProviderType)
    if (currentProvider?.isDisabled) {
      // Find the first non-disabled provider
      const fallbackProvider = sttProviders.find((p) => !p.isDisabled)
      if (fallbackProvider) {
        setSTTProvider(fallbackProvider.type)
      }
    }
  }, [lang, sttProviders, sttProviderType, setSTTProvider])

  // Check if current provider is supported
  const isSupported = isSTTReady || !isLoading

  // Voice settings now live in the main Settings menu; apply changes made there.
  useEffect(() => {
    if (savedSTTProvider) void setSTTProvider(savedSTTProvider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSTTProvider])
  useEffect(() => {
    if (savedTTSProvider) void setTTSProvider(savedTTSProvider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTTSProvider])

  // Handle speak button - speaks the AI response
  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking()
    } else if (aiResponse) {
      // Strip markdown for speech
      const textToSpeak = aiResponse
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/#+\s/g, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .trim()

      if (textToSpeak) {
        await speak(textToSpeak)
      }
    }
  }

  return (
    <DefaultLayout
      showBackButton={false}
      showTabbar={false}
      title={t('Live')}
      pageMenuActions={
        <>
          <AccountMenuButton />
          {/* Search, history and new chat live up here on Chat (no bottom bar). */}
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label={t('Search')}
            title={t('Search')}
            onPress={() => useSearchStore.getState().open()}
          >
            <Icon name="Search" size="md" />
          </Button>
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label={t('History')}
            title={t('History')}
            onPress={() => navigate(url('/tasks'))}
          >
            <Icon name="ClockRotateRight" size="md" />
          </Button>
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label={t('New Task')}
            title={t('New Task')}
            onPress={() => navigate(url('/'))}
          >
            <Icon name="PlusCircleSolid" size="md" />
          </Button>
          {/* Agent Selector */}
          {selectedAgent && !isAgentLoading && (
            <AgentSelector
              lang={lang}
              selectedAgent={selectedAgent}
              onAgentChange={handleAgentChange}
            />
          )}

          {/* One settings menu: the main one (voice settings live inside it). */}
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label={t('Settings')}
            title={t('Settings')}
            onPress={() => navigate(`${location.pathname}#settings`)}
          >
            <Icon name="Settings" size="md" />
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center justify-center sm:justify-end h-[calc(100dvh-var(--mobile-bar))] w-full gap-3 sm:gap-8 relative overflow-hidden pt-12 pb-4 sm:pt-0 sm:pb-16 folded-portrait:h-dvh">
        {/* The talking naga */}
        <div className="relative z-10 flex w-full justify-center">
          <NagaFace
            state={nagaState}
            amplitude={nagaAmplitude}
            className="h-[min(13.33rem,29dvh)] w-[min(13.33rem,29dvh)] sm:h-[18.67rem] sm:w-[18.67rem] drop-shadow-lg"
          />
        </div>

        {/* The speech line sits between the avatar and the buttons, with the same
            gap above and below it. */}
        <div className="relative z-0 h-10 w-full shrink-0 sm:h-14 pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 flex h-0 items-center">
            <VoiceWaveform
              isActive={isRecording || isSpeaking}
              width={2000}
              height={4000}
              color="hsl(var(--heroui-primary))"
              lineWidth={2}
              className="w-full h-auto min-w-full"
              ttsAnalyserRef={ttsAnalyserRef}
            />
          </div>
        </div>

        {/* Loading progress indicator */}
        {isLoading && loadingProgress && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-content1 rounded-lg p-4 shadow-lg min-w-64">
            <p className="text-sm text-default-500 mb-2">
              {loadingProgress.status}
            </p>
            {loadingProgress.progress !== undefined && (
              <Progress
                value={loadingProgress.progress * 100}
                size="sm"
                color="primary"
              />
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-danger-50 text-danger rounded-lg p-4 shadow-lg max-w-md">
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* Actions panel - overlaid by default, bottom half when folded */}
        <div className="contents folded-portrait:flex folded-portrait:flex-col folded-portrait:items-center folded-portrait:justify-center folded-portrait:h-[env(viewport-segment-height_0_1,50%)] folded-portrait:min-h-[env(viewport-segment-height_0_1,50%)] folded-portrait:gap-4">
          {/* Main controls */}
          <div className="flex justify-center items-center gap-4 w-full relative z-10">
            {/* Stop generation button */}
            {isGenerating && (
              <Tooltip content={t('Stop')} placement="top">
                <Button
                  isIconOnly
                  color="danger"
                  radius="full"
                  variant="ghost"
                  size="lg"
                  onPress={() => setIsGenerating(false)}
                  className="h-16 w-16 min-h-16 min-w-16 p-0"
                >
                  <Icon name="Xmark" size="2xl" className="live-icon" />
                </Button>
              </Tooltip>
            )}

            {/* TTS Play button - for AI response */}
            {aiResponse && (isTTSReady || device.canSpeak) && !isGenerating && (
              <Tooltip
                content={
                  isSpeaking ? t('Stop speaking') : t('Speak transcript')
                }
                placement="top"
              >
                <Button
                  isIconOnly
                  color={isSpeaking ? 'warning' : 'secondary'}
                  radius="full"
                  variant="ghost"
                  size="lg"
                  onPress={handleSpeak}
                  className="h-16 w-16 min-h-16 min-w-16 p-0"
                >
                  <Icon name={isSpeaking ? 'Pause' : 'Voice'} size="2xl" className="live-icon" />
                </Button>
              </Tooltip>
            )}

            {/* Main record button */}
            <Tooltip content={t('Speak to microphone')} placement="bottom">
              <Button
                isIconOnly
                color={isRecording ? 'primary' : 'default'}
                isDisabled={!isSupported || isGenerating}
                radius="full"
                variant="ghost"
                size="lg"
                onPress={toggleRecording}
                className="h-16 w-16 min-h-16 min-w-16 p-0"
              >
                {isLoading || isGenerating ? (
                  <Icon name="RefreshDouble" size="2xl" className="live-icon animate-spin" />
                ) : (
                  <Icon
                    name={isRecording ? 'MicrophoneSpeaking' : 'Microphone'}
                    size="2xl"
                    className="live-icon"
                  />
                )}
              </Button>
            </Tooltip>
          </div>
          {/* AI Response display */}
          {aiResponse && (
            <div className="text-center text-base sm:text-xl font-medium px-4 max-w-4xl relative z-10 text-primary-600 dark:text-primary-400 line-clamp-4 sm:line-clamp-6">
              {aiResponse}
            </div>
          )}

          {/* Transcript / User speech display */}
          <div className="text-center text-lg sm:text-2xl font-medium min-h-10 sm:min-h-16 px-4 max-w-4xl relative z-10">
            {isRecording && transcript ? (
              <span className="text-default-700">{transcript}</span>
            ) : isGenerating ? (
              <span className="text-default-400 animate-pulse">
                {t('Thinking…')}
              </span>
            ) : isRecording ? (
              <span className="text-default-400">{t('Listening…')}</span>
            ) : (
              transcript && (
                <span className="text-default-500">{transcript}</span>
              )
            )}
          </div>

        </div>
      </div>
    </DefaultLayout>
  )
}
