import { useCallback, useRef, useState } from 'react'

interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}

interface SpeechRecognitionErrorLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionResultLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

/**
 * One shared recognizer for however many mic buttons a form has (only one can listen at a
 * time anyway). Each caller passes its own `id` so it can tell whether *it* is the one
 * currently listening; starting a new one stops whatever was running first.
 */
export function useSpeechToText() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const supported = getRecognitionCtor() != null

  const start = useCallback((id: string, lang: string, onResult: (text: string) => void) => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    recognitionRef.current?.stop()

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
    }
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone access denied' : 'Could not hear you — try again')
    }
    recognition.onend = () => setActiveId((current) => (current === id ? null : current))

    recognitionRef.current = recognition
    setError(null)
    setActiveId(id)
    recognition.start()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { supported, activeId, start, stop, error }
}
