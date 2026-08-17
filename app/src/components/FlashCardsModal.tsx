import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, Layers, Star, Volume2, X } from 'lucide-react'
import type { Language, PhraseListItem } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { speak } from '../lib/tts'

type FlashFilter = 'all' | 'unlearned' | 'favourites'
type GuessDirection = 'english' | 'translation'

interface Props {
  languages: Language[]
  activeLanguageId: number | null
  getLanguagePhrases: (languageId: number) => Promise<PhraseListItem[]>
  onToggleLearned: (translationId: number, learned: boolean) => void
  onToggleFavorite: (translationId: number, favorite: boolean) => void
  onClose: () => void
}

const FILTERS: { value: FlashFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unlearned', label: 'Not Learnt' },
  { value: 'favourites', label: 'Favourites' },
]

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
    active ? 'border-fabpink bg-fabpink/15 text-fabpink' : 'border-hairline text-ink hover:bg-surfacehover'
  }`
}

export function FlashCardsModal({ languages, activeLanguageId, getLanguagePhrases, onToggleLearned, onToggleFavorite, onClose }: Props) {
  const [step, setStep] = useState<'setup' | 'session' | 'complete'>('setup')
  const [languageId, setLanguageId] = useState<number | null>(activeLanguageId ?? languages[0]?.id ?? null)
  const [filter, setFilter] = useState<FlashFilter>('all')
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set())
  const [direction, setDirection] = useState<GuessDirection>('english')
  const [languagePhrases, setLanguagePhrases] = useState<PhraseListItem[]>([])
  const [loadingPhrases, setLoadingPhrases] = useState(false)

  const [deck, setDeck] = useState<PhraseListItem[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [cardDirection, setCardDirection] = useState<'forward' | 'back'>('forward')
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (languageId == null) {
      setLanguagePhrases([])
      return
    }
    let cancelled = false
    setLoadingPhrases(true)
    getLanguagePhrases(languageId).then((list) => {
      if (cancelled) return
      setLanguagePhrases(list)
      setLoadingPhrases(false)
    })
    return () => {
      cancelled = true
    }
  }, [languageId, getLanguagePhrases])

  // Categories chosen for one language may not exist for another — reset rather than filter
  // against ids that no longer apply once the language changes.
  useEffect(() => {
    setCategoryIds(new Set())
  }, [languageId])

  function toggleCategory(id: number) {
    setCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const availableCategories = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of languagePhrases) {
      if (p.categoryId != null && p.categoryName) map.set(p.categoryId, p.categoryName)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [languagePhrases])

  const matchingPhrases = useMemo(() => {
    return languagePhrases.filter((p) => {
      if (!p.text) return false
      if (filter === 'favourites' && !p.favorite) return false
      if (filter === 'unlearned' && p.learned) return false
      if (categoryIds.size > 0 && (p.categoryId == null || !categoryIds.has(p.categoryId))) return false
      return true
    })
  }, [languagePhrases, filter, categoryIds])

  const activeLanguage = languages.find((l) => l.id === languageId)
  const languageCode = activeLanguage?.code ?? 'en'
  const card = deck[index]
  const promptIsTranslation = direction === 'translation'
  const frontText = card ? (promptIsTranslation ? card.text : card.english) : ''
  const backText = card ? (promptIsTranslation ? card.english : card.text) : ''
  const shownText = flipped ? backText : frontText
  const shownIsTranslation = flipped ? !promptIsTranslation : promptIsTranslation

  function startSession() {
    setDeck(matchingPhrases)
    setIndex(0)
    setFlipped(false)
    setStep('session')
  }

  function goNext() {
    if (index >= deck.length - 1) {
      setStep('complete')
      return
    }
    setCardDirection('forward')
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  function goPrev() {
    if (index === 0) return
    setCardDirection('back')
    setIndex((i) => i - 1)
    setFlipped(false)
  }

  function updateCard(patch: Partial<Pick<PhraseListItem, 'learned' | 'favorite'>>) {
    if (!card) return
    setDeck((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
    if (patch.learned != null) onToggleLearned(card.translationId, patch.learned)
    if (patch.favorite != null) onToggleFavorite(card.translationId, patch.favorite)
  }

  function handleCardTouchStart(e: React.TouchEvent) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handleCardTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return

    // A swipe would otherwise still end in the browser's emulated click a moment later, which
    // would immediately flip the card that just slid in — stop that compatibility event outright
    // rather than trying to detect and swallow it downstream.
    e.preventDefault()
    if (deltaX < 0) goNext()
    else goPrev()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-appbg text-ink"
      style={{ paddingTop: 'var(--safe-area-inset-top, 0px)', paddingBottom: 'var(--safe-area-inset-bottom, 0px)' }}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-hairline shrink-0">
        <div className="flex items-center gap-2">
          {step === 'session' ? (
            <button
              onClick={() => setStep('setup')}
              className="rounded-full p-1.5 -ml-1.5 text-muted hover:bg-surfacehover hover:text-ink active:scale-90 transition-all"
              aria-label="Back to settings"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          ) : (
            <Layers size={20} strokeWidth={2} className="text-fabpink" />
          )}
          <h1 className="text-lg font-bold tracking-tight">Flash Cards</h1>
        </div>
        <div className="flex items-center gap-3">
          {step === 'session' && (
            <span className="text-sm font-medium text-muted">
              {index + 1} / {deck.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-surfacehover hover:text-ink active:scale-90 transition-all"
            aria-label="Close flash cards"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      {step === 'setup' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
            {languages.length === 0 ? (
              <p className="text-center text-muted text-sm py-12">Add a language to get started.</p>
            ) : (
              <>
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Language</h2>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <button key={lang.id} onClick={() => setLanguageId(lang.id)} className={pillClass(languageId === lang.id)}>
                        <span className="text-base leading-none mr-1.5" aria-hidden="true">
                          {getLanguageFlag(lang.code)}
                        </span>
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Phrases</h2>
                  <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                      <button key={f.value} onClick={() => setFilter(f.value)} className={pillClass(filter === f.value)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </section>

                {availableCategories.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Category</h2>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setCategoryIds(new Set())} className={pillClass(categoryIds.size === 0)}>
                        All categories
                      </button>
                      {availableCategories.map((c) => (
                        <button key={c.id} onClick={() => toggleCategory(c.id)} className={pillClass(categoryIds.has(c.id))}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Guess via</h2>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setDirection('english')} className={pillClass(direction === 'english')}>
                      English
                    </button>
                    <button onClick={() => setDirection('translation')} className={pillClass(direction === 'translation')}>
                      {activeLanguage?.name ?? 'Translation'}
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>

          {languages.length > 0 && (
            <footer className="px-4 py-4 border-t border-hairline shrink-0">
              <p className="text-sm text-muted mb-3 text-center">
                {loadingPhrases ? 'Loading phrases…' : `${matchingPhrases.length} phrase${matchingPhrases.length === 1 ? '' : 's'} match`}
              </p>
              <button
                onClick={startSession}
                disabled={matchingPhrases.length === 0 || loadingPhrases}
                className="w-full rounded-full bg-fabpink px-5 py-3 text-base font-semibold text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
              >
                Start
              </button>
            </footer>
          )}
        </>
      )}

      {step === 'session' && card && (
        <div className="flex-1 flex flex-col px-4 py-4 min-h-0">
          <div className="flex items-center justify-center pb-3 shrink-0">
            <button
              onClick={() => {
                setDirection((d) => (d === 'english' ? 'translation' : 'english'))
                setFlipped(false)
              }}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all"
              title="Swap guess direction"
            >
              <ArrowLeftRight size={13} strokeWidth={2.5} className="text-fabpink" />
              Guess via {promptIsTranslation ? (activeLanguage?.name ?? 'Translation') : 'English'}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0">
            <button
              key={index}
              onClick={() => setFlipped((f) => !f)}
              onTouchStart={handleCardTouchStart}
              onTouchEnd={handleCardTouchEnd}
              className="animate-slide-in w-full max-w-sm min-h-64 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-fabpink/40 bg-surface px-6 py-10 shadow-xl active:scale-[0.99] transition-all text-center touch-pan-y"
              style={{ '--slide-from': cardDirection === 'forward' ? '24px' : '-24px' } as React.CSSProperties}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{flipped ? 'Answer' : 'Tap to reveal'}</span>
              <span className="text-2xl font-bold leading-snug text-ink break-words">{shownText || <span className="italic text-muted">&mdash;</span>}</span>
              {card.categoryName && <span className="text-xs text-muted">{card.categoryName}</span>}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 py-4 shrink-0">
            <button
              onClick={() => {
                if (shownIsTranslation) speak(card.text, languageCode)
              }}
              disabled={!shownIsTranslation}
              className="rounded-full p-2.5 border border-hairline text-muted hover:bg-surfacehover disabled:opacity-30 transition-all"
              aria-label="Speak"
              title="Speak"
            >
              <Volume2 size={18} strokeWidth={2} />
            </button>
            <button onClick={() => updateCard({ favorite: !card.favorite })} className={pillClass(card.favorite) + ' flex items-center gap-1.5'}>
              <Star size={15} strokeWidth={2.5} fill={card.favorite ? 'currentColor' : 'none'} />
              Favourite
            </button>
            <button onClick={() => updateCard({ learned: !card.learned })} className={pillClass(card.learned) + ' flex items-center gap-1.5'}>
              <Check size={15} strokeWidth={2.5} />
              Learnt
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex-1 rounded-full border border-hairline py-3 flex items-center justify-center gap-1 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={18} strokeWidth={2} /> Previous
            </button>
            <button
              onClick={goNext}
              className="flex-1 rounded-full bg-fabpink py-3 text-sm font-semibold text-white shadow-lg shadow-fabpink/20 flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              {index === deck.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <Layers size={40} strokeWidth={1.5} className="text-fabpink" />
          <h2 className="text-xl font-bold">Deck complete</h2>
          <p className="text-sm text-muted">
            You reviewed {deck.length} phrase{deck.length === 1 ? '' : 's'}.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
            <button
              onClick={() => {
                setIndex(0)
                setFlipped(false)
                setStep('session')
              }}
              className="rounded-full bg-fabpink px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
            >
              Study again
            </button>
            <button
              onClick={() => setStep('setup')}
              className="rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all"
            >
              Change settings
            </button>
            <button onClick={onClose} className="rounded-full px-5 py-3 text-sm font-medium text-muted hover:text-ink transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
