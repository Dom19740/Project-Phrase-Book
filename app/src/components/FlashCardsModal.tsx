import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, Layers, Shuffle, Star, Volume2, X } from 'lucide-react'
import type { Category, Language, PhraseListItem } from '../db/types'
import { getLanguageFlag } from '../lib/languageFlags'
import { speak } from '../lib/tts'
import { useSpeakRate } from '../lib/useSpeakRate'
import { EditPhraseModal } from './EditPhraseModal'

type FlashFilterFlag = 'unlearned' | 'favorites'
type GuessDirection = 'english' | 'translation'

interface Props {
  languages: Language[]
  categories: Category[]
  activeLanguageId: number | null
  getLanguagePhrases: (languageId: number) => Promise<PhraseListItem[]>
  onToggleLearned: (translationId: number, learned: boolean) => void
  onToggleFavorite: (translationId: number, favorite: boolean) => void
  onEditPhrase: (phraseConceptId: number, translationId: number, english: string, text: string, categoryName: string | null) => Promise<void>
  onDeleteOneLanguage: (translationId: number) => Promise<void>
  onDeleteAllLanguages: (phraseConceptId: number) => Promise<void>
  onClose: () => void
}

const LONG_PRESS_MS = 500

const FILTERS: { value: FlashFilterFlag; label: string }[] = [
  { value: 'unlearned', label: 'Not Learnt' },
  { value: 'favorites', label: 'Favorites' },
]

function shuffled<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
    active ? 'border-fabpink bg-fabpink/15 text-fabpink' : 'border-hairline text-ink hover:bg-surfacehover'
  }`
}

export function FlashCardsModal({
  languages,
  categories,
  activeLanguageId,
  getLanguagePhrases,
  onToggleLearned,
  onToggleFavorite,
  onEditPhrase,
  onDeleteOneLanguage,
  onDeleteAllLanguages,
  onClose,
}: Props) {
  const [step, setStep] = useState<'setup' | 'session' | 'complete'>('setup')
  const [languageId, setLanguageId] = useState<number | null>(activeLanguageId ?? languages[0]?.id ?? null)
  const [filterFlags, setFilterFlags] = useState<Set<FlashFilterFlag>>(new Set())
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set())
  const [direction, setDirection] = useState<GuessDirection>('english')
  const [shuffle, setShuffle] = useState(false)
  const [languagePhrases, setLanguagePhrases] = useState<PhraseListItem[]>([])
  const [loadingPhrases, setLoadingPhrases] = useState(false)

  const [deck, setDeck] = useState<PhraseListItem[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [cardDirection, setCardDirection] = useState<'forward' | 'back'>('forward')
  const [speaking, setSpeaking] = useState(false)
  const [editingCard, setEditingCard] = useState<PhraseListItem | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const pressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)
  const swipeFired = useRef(false)
  const nextSpeakRate = useSpeakRate()

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

  // Deleting the card being studied (via the edit dialog) shrinks the deck out from under the
  // current index — keep it in range, or end the session if nothing's left.
  useEffect(() => {
    if (step !== 'session') return
    if (deck.length === 0) {
      setStep('complete')
    } else if (index > deck.length - 1) {
      setIndex(deck.length - 1)
    }
  }, [deck, step, index])

  function toggleFilterFlag(flag: FlashFilterFlag) {
    setFilterFlags((prev) => {
      const next = new Set(prev)
      if (next.has(flag)) next.delete(flag)
      else next.add(flag)
      return next
    })
  }

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
      if (filterFlags.has('favorites') && !p.favorite) return false
      if (filterFlags.has('unlearned') && p.learned) return false
      if (categoryIds.size > 0 && (p.categoryId == null || !categoryIds.has(p.categoryId))) return false
      return true
    })
  }, [languagePhrases, filterFlags, categoryIds])

  const activeLanguage = languages.find((l) => l.id === languageId)
  const languageCode = activeLanguage?.code ?? 'en'
  const card = deck[index]
  const promptIsTranslation = direction === 'translation'
  const frontText = card ? (promptIsTranslation ? card.text : card.english) : ''
  const backText = card ? (promptIsTranslation ? card.english : card.text) : ''
  const shownIsTranslation = flipped ? !promptIsTranslation : promptIsTranslation

  function startSession() {
    setDeck(shuffle ? shuffled(matchingPhrases) : matchingPhrases)
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

  function clearPressTimer() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handleCardPointerDown(e: React.PointerEvent) {
    longPressFired.current = false
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    // Capture so a fast drag that carries the pointer outside the card's bounds still delivers
    // move/up here instead of losing the gesture — without this, onPointerLeave firing mid-swipe
    // reset the drag before pointerup could measure it, and the swipe never registered.
    e.currentTarget.setPointerCapture(e.pointerId)
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      if (card) setEditingCard(card)
    }, LONG_PRESS_MS)
  }

  function handleCardPointerMove(e: React.PointerEvent) {
    const start = dragStartRef.current
    if (!start) return
    // A pointer that's already moved is swiping/dragging, not long-pressing — don't let a slow
    // drag open Edit.
    if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) clearPressTimer()
  }

  function handleCardPointerUp(e: React.PointerEvent) {
    clearPressTimer()
    const start = dragStartRef.current
    dragStartRef.current = null
    if (!start) return

    const deltaX = e.clientX - start.x
    const deltaY = e.clientY - start.y

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return

    // A drag would otherwise still end in a click a moment later, which would immediately flip
    // the card that just slid in — flag it so handleCardClick can swallow that click.
    swipeFired.current = true
    if (deltaX < 0) goNext()
    else goPrev()
  }

  function handleCardPointerCancel() {
    clearPressTimer()
    dragStartRef.current = null
  }

  function handleCardClick() {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    if (swipeFired.current) {
      swipeFired.current = false
      return
    }
    setFlipped((f) => !f)
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
                    <button onClick={() => setFilterFlags(new Set())} className={pillClass(filterFlags.size === 0)}>
                      All
                    </button>
                    {FILTERS.map((f) => (
                      <button key={f.value} onClick={() => toggleFilterFlag(f.value)} className={pillClass(filterFlags.has(f.value))}>
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

                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Order</h2>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShuffle((s) => !s)} className={pillClass(shuffle) + ' flex items-center gap-1.5'}>
                      <Shuffle size={15} strokeWidth={2.5} />
                      Shuffle cards
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
                className="w-full rounded-full bg-fabpink px-5 py-3 text-base font-semibold text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all disabled:opacity-40"
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

          <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
            <button
              key={index}
              onClick={handleCardClick}
              onPointerDown={handleCardPointerDown}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
              onPointerCancel={handleCardPointerCancel}
              className="animate-slide-in w-full max-w-sm h-64 shrink-0 select-none active:scale-[0.99] transition-transform touch-pan-y"
              style={{ '--slide-from': cardDirection === 'forward' ? '24px' : '-24px', perspective: '1200px' } as React.CSSProperties}
              title="Tap to flip, long-press to edit"
            >
              <div
                className="relative h-full w-full transition-transform duration-500 ease-out"
                style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-3xl border-2 border-fabpink/40 bg-surface px-6 py-10 shadow-xl text-center"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as React.CSSProperties}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Tap to reveal</span>
                  <span className="text-2xl font-bold leading-snug text-ink break-words">{frontText || <span className="italic text-muted">&mdash;</span>}</span>
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-3xl bg-fabpink px-6 py-10 shadow-xl text-center"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' } as React.CSSProperties}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-black/70">
                    {promptIsTranslation ? 'English' : (activeLanguage?.name ?? 'Translation')}
                  </span>
                  <span className="text-2xl font-bold leading-snug text-black break-words">{backText || <span className="italic text-black/60">&mdash;</span>}</span>
                </div>
              </div>
            </button>

            <div className="w-full max-w-sm flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={goPrev}
                disabled={index === 0}
                className="flex-1 rounded-full border border-hairline py-3 flex items-center justify-center gap-1 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all disabled:opacity-30"
              >
                <ChevronLeft size={18} strokeWidth={2} /> Previous
              </button>
              <button
                onClick={goNext}
                className="flex-1 rounded-full bg-fabpink py-3 text-sm font-semibold text-onaccent shadow-lg shadow-fabpink/20 flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                {index === deck.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 shrink-0">
              <button
                onClick={async () => {
                  if (!shownIsTranslation) return
                  setSpeaking(true)
                  try {
                    await speak(card.text, languageCode, nextSpeakRate(card.translationId))
                  } finally {
                    setSpeaking(false)
                  }
                }}
                disabled={!shownIsTranslation}
                className={`rounded-full p-2.5 border border-hairline hover:bg-surfacehover disabled:opacity-30 transition-all ${speaking ? 'text-fabpink' : 'text-muted'}`}
                aria-label="Speak"
                title="Speak"
              >
                <Volume2 size={18} strokeWidth={2} />
              </button>
              <button onClick={() => updateCard({ favorite: !card.favorite })} className={pillClass(card.favorite) + ' flex items-center gap-1.5'}>
                <Star size={15} strokeWidth={2.5} fill={card.favorite ? 'currentColor' : 'none'} />
                Favorite
              </button>
              <button onClick={() => updateCard({ learned: !card.learned })} className={pillClass(card.learned) + ' flex items-center gap-1.5'}>
                <Check size={15} strokeWidth={2.5} />
                Learnt
              </button>
            </div>
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
              className="rounded-full bg-fabpink px-5 py-3 text-sm font-semibold text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
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

      {editingCard && (
        <EditPhraseModal
          phrase={editingCard}
          languageCode={languageCode}
          languageName={activeLanguage?.name ?? ''}
          categories={categories}
          onClose={() => setEditingCard(null)}
          onSubmit={async (english, text, categoryName) => {
            await onEditPhrase(editingCard.phraseConceptId, editingCard.translationId, english, text, categoryName)
            const patch = { english, text, categoryName }
            setLanguagePhrases((prev) => prev.map((p) => (p.translationId === editingCard.translationId ? { ...p, ...patch } : p)))
            setDeck((prev) => prev.map((p) => (p.translationId === editingCard.translationId ? { ...p, ...patch } : p)))
          }}
          onDeleteOneLanguage={async (translationId) => {
            await onDeleteOneLanguage(translationId)
            setLanguagePhrases((prev) => prev.filter((p) => p.translationId !== translationId))
            setDeck((prev) => prev.filter((p) => p.translationId !== translationId))
          }}
          onDeleteAllLanguages={async (phraseConceptId) => {
            await onDeleteAllLanguages(phraseConceptId)
            setLanguagePhrases((prev) => prev.filter((p) => p.phraseConceptId !== phraseConceptId))
            setDeck((prev) => prev.filter((p) => p.phraseConceptId !== phraseConceptId))
          }}
        />
      )}
    </div>
  )
}
