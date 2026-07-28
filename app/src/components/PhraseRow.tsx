import { Check, Volume2 } from 'lucide-react'
import { speak } from '../lib/tts'
import type { PhraseListItem } from '../db/types'

interface Props {
  phrase: PhraseListItem
  accent: string
  languageCode: string
  onToggleLearned: (id: number, learned: boolean) => void
  onEdit: (phrase: PhraseListItem) => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (translationId: number) => void
}

export function PhraseRow({
  phrase,
  accent,
  languageCode,
  onToggleLearned,
  onEdit,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  return (
    <div
      id={`phrase-row-${phrase.translationId}`}
      className="group flex items-center gap-1.5 rounded-2xl bg-surface border border-hairline px-2 py-1 shadow-md transition-colors hover:border-neutral-600"
      style={phrase.learned ? { borderColor: accent } : undefined}
    >
      <button
        type="button"
        onClick={() => speak(phrase.text, languageCode)}
        disabled={!phrase.text}
        className="shrink-0 rounded-full p-1.5 hover:bg-surfacehover disabled:opacity-25 disabled:text-muted transition-colors"
        style={phrase.text ? { color: accent } : undefined}
        aria-label="Speak phrase"
        title="Speak"
      >
        <Volume2 size={16} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={() => (selectionMode ? onToggleSelect?.(phrase.translationId) : onEdit(phrase))}
        className="min-w-0 flex-1 text-left rounded-lg px-0.5 py-0.5"
        title={selectionMode ? 'Tap to select' : 'Tap to edit'}
      >
        <p className="sm:truncate text-sm leading-5">
          <span className="text-muted">{phrase.english} </span>
          {phrase.text ? (
            <span className="font-semibold text-ink">{phrase.text}</span>
          ) : (
            <span className="italic text-neutral-600">needs translation</span>
          )}
        </p>
      </button>

      {selectionMode ? (
        <label className="shrink-0 flex items-center justify-center p-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(phrase.translationId)}
            className="size-4 shrink-0 rounded accent-current cursor-pointer"
            style={{ color: accent }}
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => onToggleLearned(phrase.translationId, !phrase.learned)}
          className={`shrink-0 flex items-center justify-center p-1.5 rounded-full hover:bg-surfacehover transition-colors ${
            phrase.learned ? '' : 'text-muted'
          }`}
          style={phrase.learned ? { color: accent } : undefined}
          aria-label={phrase.learned ? 'Mark as unlearned' : 'Mark as learned'}
          title={phrase.learned ? 'Mark as unlearned' : 'Mark as learned'}
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
