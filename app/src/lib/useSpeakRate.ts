import { useRef } from 'react'

// Listening to the same phrase again shortly after is almost always someone who missed a word
// and wants it slower — so the repeat plays at a reduced rate, then speed resets back to normal
// once they've moved on for a bit.
const REPEAT_WINDOW_MS = 5000
const SLOW_RATE = 0.3
const NORMAL_RATE = 1.0

/** Returns a function that gives the TTS rate to use for a given phrase id — slowed down when it's
 * the same phrase heard again within the repeat window, back to normal otherwise. */
export function useSpeakRate() {
  const lastRef = useRef<{ id: string | number; at: number } | null>(null)

  return function nextSpeakRate(id: string | number): number {
    const now = Date.now()
    const last = lastRef.current
    const rate = last != null && last.id === id && now - last.at < REPEAT_WINDOW_MS ? SLOW_RATE : NORMAL_RATE
    lastRef.current = { id, at: now }
    return rate
  }
}
