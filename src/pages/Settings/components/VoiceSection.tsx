/**
 * Voice settings inside the main Settings menu (speech input/output providers,
 * auto-speak, and the AI's voice). Chat no longer has a second settings button;
 * its gear opens this menu instead.
 */
import { VoiceSettingsPanel } from '@/features/live/components/VoiceSettingsPanel'
import type { STTProviderType, TTSProviderType } from '@/features/live/lib/types'
import { useI18n } from '@/i18n'
import { userSettings } from '@/stores/userStore'

export function VoiceSection() {
  const { lang } = useI18n()
  const {
    kokoroVoiceId,
    setKokoroVoiceId,
    sttProvider,
    setSTTProvider,
    ttsProvider,
    setTTSProvider,
    liveAutoSpeak,
    setLiveAutoSpeak,
  } = userSettings()

  return (
    <VoiceSettingsPanel
      autoSpeak={liveAutoSpeak ?? true}
      onAutoSpeakChange={setLiveAutoSpeak}
      sttProviderType={(sttProvider || 'assemblyai') as STTProviderType}
      onSTTProviderChange={(type) => setSTTProvider(type)}
      ttsProviderType={
        (ttsProvider || (lang === 'en' ? 'kokoro' : 'web-speech')) as TTSProviderType
      }
      onTTSProviderChange={(type) => setTTSProvider(type)}
      selectedVoiceId={kokoroVoiceId || 'am_adam'}
      onVoiceChange={setKokoroVoiceId}
    />
  )
}
