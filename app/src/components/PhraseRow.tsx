import { Volume2 } from 'lucide-react'
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
  const checked = selectionMode ? selected : phrase.learned

  return (
    <div
      id={`phrase-row-${phrase.translationId}`}
      className="group flex items-center gap-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 px-2 py-1 shadow-sm transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
    >
      <button
        type="button"
        onClick={() => speak(phrase.text, languageCode)}
        disabled={!phrase.text}
        className="shrink-0 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 disabled:opacity-25 transition-colors"
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
          <span className="text-neutral-500 dark:text-neutral-400">{phrase.english} </span>
          {phrase.text ? (
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{phrase.text}</span>
          ) : (
            <span className="italic text-neutral-400 dark:text-neutral-600">needs translation</span>
          )}
        </p>
      </button>

      <label className="shrink-0 flex items-center justify-center p-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => (selectionMode ? onToggleSelect?.(phrase.translationId) : onToggleLearned(phrase.translationId, e.target.checked))}
          className="size-4 shrink-0 rounded accent-current cursor-pointer"
          style={{ color: accent }}
        />
      </label>
    </div>
  )
}
