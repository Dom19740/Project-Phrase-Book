import { TextToSpeech } from '@capacitor-community/text-to-speech'

// Two-letter codes stored on `languages.code` don't always resolve to a voice
// on their own (esp. the web Speech Synthesis backend) — map to a full BCP-47 locale.
const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  vi: 'vi-VN',
  id: 'id-ID',
}

export async function speak(text: string, languageCode: string): Promise<void> {
  if (!text) return
  const lang = LOCALE_MAP[languageCode] ?? languageCode
  try {
    await TextToSpeech.speak({ text, lang, rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient' })
  } catch (err) {
    console.error('TTS failed', err)
  }
}
