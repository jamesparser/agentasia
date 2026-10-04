/**
 * FeaturesSection — Settings section for conversational AI features.
 *
 * Displays:
 *  - Speech-to-text toggle
 *  - Auto memory learning toggle
 *  - Quick reply suggestions toggle
 *  - Web search grounding toggle
 *  - Hide default agents toggle
 *  - Global system instructions textarea
 */

import { Input, Radio, RadioGroup, Textarea } from '@heroui/react'
import { useI18n } from '@/i18n'
import { userSettings } from '@/stores/userStore'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from '../i18n'
import { Switch } from '@/components'
import { useSpaceScopedSetting } from '../useSpaceScopedSetting'

export function FeaturesSection() {
  const { t } = useI18n(localI18n)
  const { getHighlightClasses } = useHashHighlight()

  // Local-only setting (not space-scopable)
  const speechToTextEnabled = userSettings((state) => state.speechToTextEnabled)
  const sttEngine = userSettings((state) => state.sttEngine)
  const setSttEngine = userSettings((state) => state.setSttEngine)
  const setSpeechToTextEnabled = userSettings(
    (state) => state.setSpeechToTextEnabled,
  )

  // Synced settings — space-scopable
  const _hideDefaultAgents = userSettings((state) => state.hideDefaultAgents)
  const _setHideDefaultAgents = userSettings(
    (state) => state.setHideDefaultAgents,
  )
  const [hideDefaultAgents, setHideDefaultAgents] = useSpaceScopedSetting(
    'hideDefaultAgents',
    _hideDefaultAgents,
    _setHideDefaultAgents,
  )

  const _autoMemoryLearning = userSettings(
    (state) => state.autoMemoryLearning ?? true,
  )
  const _setAutoMemoryLearning = userSettings(
    (state) => state.setAutoMemoryLearning,
  )
  const [autoMemoryLearning, setAutoMemoryLearning] = useSpaceScopedSetting(
    'autoMemoryLearning',
    _autoMemoryLearning,
    _setAutoMemoryLearning as (v: boolean | undefined) => void,
  )

  const _suggestionsEnabled = userSettings(
    (state) => state.suggestionsEnabled ?? true,
  )
  const _setSuggestionsEnabled = userSettings(
    (state) => state.setSuggestionsEnabled,
  )
  const [suggestionsEnabled, setSuggestionsEnabled] = useSpaceScopedSetting(
    'suggestionsEnabled',
    _suggestionsEnabled,
    _setSuggestionsEnabled as (v: boolean | undefined) => void,
  )

  const _enableWebSearchGrounding = userSettings(
    (state) => state.enableWebSearchGrounding ?? true,
  )
  const _setEnableWebSearchGrounding = userSettings(
    (state) => state.setEnableWebSearchGrounding,
  )
  const [enableWebSearchGrounding, setEnableWebSearchGrounding] =
    useSpaceScopedSetting(
      'enableWebSearchGrounding',
      _enableWebSearchGrounding,
      _setEnableWebSearchGrounding as (v: boolean | undefined) => void,
    )

  const _globalSystemInstructions = userSettings(
    (state) => state.globalSystemInstructions ?? '',
  )
  const _setGlobalSystemInstructions = userSettings(
    (state) => state.setGlobalSystemInstructions,
  )
  const [globalSystemInstructions, setGlobalSystemInstructions] =
    useSpaceScopedSetting(
      'globalSystemInstructions',
      _globalSystemInstructions,
      _setGlobalSystemInstructions as (v: string | undefined) => void,
    )

  const _yoloMode = userSettings((state) => state.yoloMode ?? false)
  const _setYoloMode = userSettings((state) => state.setYoloMode)
  const [yoloMode, setYoloMode] = useSpaceScopedSetting(
    'yoloMode',
    _yoloMode,
    _setYoloMode as (v: boolean | undefined) => void,
  )

  const _huggingfaceBaseUrl = userSettings(
    (state) => state.huggingfaceBaseUrl ?? '',
  )
  const _setHuggingfaceBaseUrl = userSettings(
    (state) => state.setHuggingfaceBaseUrl,
  )
  const [huggingfaceBaseUrl, setHuggingfaceBaseUrl] = useSpaceScopedSetting(
    'huggingfaceBaseUrl',
    _huggingfaceBaseUrl,
    _setHuggingfaceBaseUrl as (v: string | undefined) => void,
  )

  return (
    <div data-testid="conversational-settings" className="space-y-8">
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Conversations')}
        </h4>
        <div
          id="quick-reply-suggestions"
          className={getHighlightClasses('quick-reply-suggestions')}
        >
          <Switch
            isSelected={suggestionsEnabled}
            onChange={(e) => setSuggestionsEnabled(e.target.checked)}
            size="sm"
          >
            <p>{t('Quick Reply Suggestions')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Show AI-generated follow-up suggestions after each assistant response',
              )}
            </p>
          </Switch>
        </div>

        <div
          id="web-search-grounding"
          className={getHighlightClasses('web-search-grounding')}
        >
          <Switch
            isSelected={enableWebSearchGrounding}
            onChange={(e) => setEnableWebSearchGrounding(e.target.checked)}
            size="sm"
          >
            <p>{t('Web Search Grounding')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Allow AI models to search the web for up-to-date information (supported by Google Gemini and Anthropic Claude)',
              )}
            </p>
          </Switch>
        </div>

        <div id="yolo-mode" className={getHighlightClasses('yolo-mode')}>
          <Switch
            isSelected={yoloMode}
            onChange={(e) => setYoloMode(e.target.checked)}
            size="sm"
          >
            <p>{t('YOLO Mode')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Skip all human intervention prompts and let agents decide autonomously',
              )}
            </p>
          </Switch>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Agents')}
        </h4>
        <div
          id="hide-default-agents"
          className={getHighlightClasses('hide-default-agents')}
        >
          <Switch
            isSelected={hideDefaultAgents}
            onChange={(e) => setHideDefaultAgents(e.target.checked)}
            size="sm"
          >
            <p>{t('Hide Default Agents')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Only show your custom agents in the agent picker and agents page',
              )}
            </p>
          </Switch>
        </div>

        <div
          id="global-system-instructions"
          className={getHighlightClasses('global-system-instructions', 'ms-6')}
        >
          <label className="text-sm font-medium text-default-600">
            {t('Global System Instructions')}
          </label>
          <p className="text-xs text-default-500 mb-2">
            {t(
              "These instructions will be prepended to every agent's instructions",
            )}
          </p>
          <Textarea
            placeholder={t(
              'Enter global instructions that apply to all agents...',
            )}
            value={globalSystemInstructions}
            onChange={(e) =>
              setGlobalSystemInstructions(e.target.value || undefined)
            }
            minRows={1}
            maxRows={10}
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Knowledge')}
        </h4>
        <div
          id="auto-memory-learning"
          className={getHighlightClasses('auto-memory-learning')}
        >
          <Switch
            isSelected={autoMemoryLearning}
            onChange={(e) => setAutoMemoryLearning(e.target.checked)}
            size="sm"
          >
            <p>{t('Auto Memory Learning')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Quietly remember durable facts from your conversations in the background, so agents stay personalised over time. Runs invisibly and never appears in replies.',
              )}
            </p>
          </Switch>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Voice')}
        </h4>
        <div
          id="speech-to-text"
          className={getHighlightClasses('speech-to-text')}
        >
          <Switch
            isSelected={speechToTextEnabled}
            onChange={(e) => setSpeechToTextEnabled(e.target.checked)}
          >
            <p>{t('Enable Speech-to-Text')}</p>
            <p className="text-xs text-default-500">
              {t(
                'Allow voice input using your device microphone in the prompt area',
              )}
            </p>
          </Switch>
        </div>

        {/* The reason voice can appear to listen and hear nothing: the browser
            engine streams audio to Google for transcription. Where that host is
            unreachable it fails with a bare network error and no transcript, so
            the alternative is a model that runs in this tab. */}
        <div
          id="speech-to-text-engine"
          className={getHighlightClasses('speech-to-text-engine')}
        >
          <RadioGroup
            aria-label={t('Voice input engine')}
            size="sm"
            value={sttEngine}
            onValueChange={(value) => setSttEngine(value as 'cloud' | 'browser' | 'device')}
            className="mt-3"
            isDisabled={!speechToTextEnabled}
          >
            <p className="text-sm font-medium text-default-700">
              {t('Voice input engine')}
            </p>
            <Radio value="cloud">
              <span>{t('Cloud (recommended)')}</span>
              <span className="block text-xs text-default-500">
                {t(
                  'Records here and sends the audio to the AgentAsia gateway, which forwards it to AssemblyAI, a third party, to be transcribed. No download and no dependence on Google. Metered per day.',
                )}
              </span>
            </Radio>
            <Radio value="browser">
              <span>{t('Browser (fast)')}</span>
              <span className="block text-xs text-default-500">
                {t(
                  'Sends your speech to Google for transcription. No download. Fails on networks where that service is blocked, and the microphone then appears to do nothing.',
                )}
              </span>
            </Radio>
            <Radio value="device">
              <span>{t('On-device (works offline)')}</span>
              <span className="block text-xs text-default-500">
                {t(
                  'Runs Whisper inside this tab. Nothing leaves your device and it works with no internet, but the first use downloads a model of roughly 300 MB and is slower on older hardware.',
                )}
              </span>
            </Radio>
          </RadioGroup>
        </div>
      </div>

      {/* AgentAsia: the Advanced group (a custom HuggingFace mirror for
          enterprise air-gapped setups) is hidden. It offers a self-hosting knob
          that this product does not support and that a reviewer would read as a
          promise. */}
      <div className="hidden">
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Advanced')}
        </h4>
        <div
          id="huggingface-base-url"
          className={getHighlightClasses('huggingface-base-url')}
        >
          <Input
            label={t('HuggingFace Host')}
            placeholder="https://huggingface.co"
            description={t(
              'Custom HuggingFace mirror or proxy URL for enterprise environments (e.g. JFrog Artifactory). Leave empty to use the official servers.',
            )}
            value={huggingfaceBaseUrl}
            onChange={(e) =>
              setHuggingfaceBaseUrl(e.target.value || undefined)
            }
            className="max-w-lg"
          />
        </div>
      </div>
    </div>
  )
}
