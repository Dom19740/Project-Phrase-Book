import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { Capacitor } from '@capacitor/core'

// Two-letter codes stored on `languages.code` don't always resolve to a voice
// on their own (esp. the web Speech Synthesis backend) - map to a full BCP-47 locale.
const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  vi: 'vi-VN',
  id: 'id-ID',
}

let installedVoiceLangsPromise: Promise<string[]> | null = null

function loadInstalledVoiceLangs(): Promise<string[]> {
  if (!installedVoiceLangsPromise) {
    installedVoiceLangsPromise = TextToSpeech.getSupportedVoices()
      .then(({ voices }) => voices.map((v) => v.lang.toLowerCase()))
      .catch(() => [])
  }
  return installedVoiceLangsPromise
}

type MissingVoiceListener = (languageCode: string) => void
const missingVoiceListeners = new Set<MissingVoiceListener>()
const warnedLanguageCodes = new Set<string>()

/** Notified (once per language per app session) when the device has no voice installed for a
 * requested dialect and silently substituted a different one - lets the UI offer to install it. */
export function onMissingVoice(listener: MissingVoiceListener): () => void {
  missingVoiceListeners.add(listener)
  return () => missingVoiceListeners.delete(listener)
}

/** Opens the OS's "install TTS voice data" screen. Android only - the plugin has no iOS equivalent. */
export function openVoiceInstallScreen(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return Promise.resolve()
  return TextToSpeech.openInstall()
}

// setLanguage() on Android/iOS never fails loudly - if the exact region voice (e.g. "pt-PT")
// isn't installed, the OS silently substitutes whatever it does have for that base language
// (e.g. "pt-BR"), so a user hears the wrong dialect with no error anywhere. Call this as soon as
// a language is added (PhraseBookContext.createLanguage) rather than waiting for the user to
// press play, so the warning is already there the first time they open the language. speak()
// also runs it as a safety net for languages added before this check existed (restores, imports).
export async function checkVoiceAvailability(languageCode: string): Promise<void> {
  const lang = LOCALE_MAP[languageCode] ?? languageCode
  if (!lang.includes('-') || warnedLanguageCodes.has(languageCode)) return
  const installed = await loadInstalledVoiceLangs()
  if (installed.length === 0) return
  if (!installed.includes(lang.toLowerCase())) {
    warnedLanguageCodes.add(languageCode)
    console.warn(`[tts] No installed voice for "${lang}" - the device will substitute a different dialect.`)
    missingVoiceListeners.forEach((listener) => listener(languageCode))
  }
}

export async function speak(text: string, languageCode: string, rate = 1.0): Promise<void> {
  if (!text) return
  const lang = LOCALE_MAP[languageCode] ?? languageCode
  void checkVoiceAvailability(languageCode)
  try {
    await TextToSpeech.speak({ text, lang, rate, pitch: 1.0, volume: 1.0, category: 'ambient' })
  } catch (err) {
    console.error('TTS failed', err)
  }
}
