import { useEffect, useState } from 'react'

const PHRASES = [
  'Write it as you go.',
  'One book, many places.',
  'No lessons, no streaks.',
  'Your order, your categories.',
]

const PHRASE_INTERVAL_MS = 2600

export function LoadingScreen() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), PHRASE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-appbg text-ink">
      <span className="spinner-taper" aria-hidden="true" />
      <p key={index} className="animate-fade-in text-sm font-medium text-muted">
        {PHRASES[index]}
      </p>
      <span className="sr-only">Loading phrase book…</span>
    </div>
  )
}
