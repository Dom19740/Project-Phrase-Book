import { useRef, useState } from 'react'
import { Check, Star, Volume2 } from 'lucide-react'
import { speak } from '../lib/tts'
import type { PhraseListItem } from '../db/types'
import { PhraseQuickMenu } from './PhraseQuickMenu'

interface Props {
  phrase: PhraseListItem
  accent: string
  languageCode: string
  onToggleLearned: (id: number, learned: boolean) => void
  onToggleFavorite: (id: number, favorite: boolean) => void
  onEdit: (phrase: PhraseListItem) => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (translationId: number) => void
}

const LONG_PRESS_MS = 500

export function PhraseRow({
  phrase,
  accent,
  languageCode,
  onToggleLearned,
  onToggleFavorite,
  onEdit,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  function clearPressTimer() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function handlePointerDown() {
    if (selectionMode) return
    longPressFired.current = false
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      onEdit(phrase)
    }, LONG_PRESS_MS)
  }

  function handleClick() {
    if (selectionMode) {
      onToggleSelect?.(phrase.translationId)
      return
    }
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    setMenuOpen(true)
  }

  return (
    <div
      id={`phrase-row-${phrase.translationId}`}
      className="group relative flex items-center gap-1.5 rounded-2xl bg-surface border border-hairline px-2 py-1 shadow-md transition-colors hover:border-neutral-600 cursor-pointer select-none"
      style={phrase.learned ? { borderColor: accent } : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onClick={handleClick}
      title={selectionMode ? 'Tap to select' : 'Tap for options, long-press to edit'}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          speak(phrase.text, languageCode)
        }}
        disabled={!phrase.text}
        className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surfacehover disabled:opacity-25 transition-colors"
        aria-label="Speak phrase"
        title="Speak"
      >
        <Volume2 size={16} strokeWidth={2} />
      </button>

      <div className="min-w-0 flex-1 px-0.5 py-0.5">
        <p className="sm:truncate text-sm leading-5">
          <span className="text-muted">{phrase.english} </span>
          {phrase.text ? (
            <span className="font-semibold text-ink">{phrase.text}</span>
          ) : (
            <span className="italic text-neutral-600">needs translation</span>
          )}
        </p>
      </div>

      {selectionMode ? (
        <label className="shrink-0 flex items-center justify-center gap-0.5 size-9 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(phrase.translationId)}
            className="size-4 shrink-0 rounded accent-current cursor-pointer"
            style={{ color: accent }}
          />
        </label>
      ) : (
        <div className="shrink-0 flex items-center justify-center gap-0.5 size-9">
          {phrase.favorite && <Star size={16} strokeWidth={2.5} fill={accent} style={{ color: accent }} aria-label="Favourite" />}
          <Check
            size={18}
            strokeWidth={2.5}
            className={phrase.learned ? '' : 'text-muted'}
            style={phrase.learned ? { color: accent } : undefined}
            aria-label={phrase.learned ? 'Learned' : 'Not learned'}
          />
        </div>
      )}

      {menuOpen && (
        <PhraseQuickMenu
          accent={accent}
          learned={phrase.learned}
          favorite={phrase.favorite}
          onToggleLearned={() => onToggleLearned(phrase.translationId, !phrase.learned)}
          onToggleFavorite={() => onToggleFavorite(phrase.translationId, !phrase.favorite)}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}
