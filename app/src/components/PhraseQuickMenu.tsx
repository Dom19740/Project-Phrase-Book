import { Check, Star } from 'lucide-react'

interface Props {
  accent: string
  learned: boolean
  favorite: boolean
  onToggleLearned: () => void
  onToggleFavorite: () => void
  onClose: () => void
}

export function PhraseQuickMenu({ accent, learned, favorite, onToggleLearned, onToggleFavorite, onClose }: Props) {
  return (
    <>
      <button
        className="fixed inset-0 z-40 cursor-default"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close menu"
      />
      <div
        className="absolute right-0 top-full z-50 mt-2 w-40 rounded-2xl border border-hairline bg-surface p-1.5 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleLearned}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover"
        >
          <Check size={16} strokeWidth={2.5} className={learned ? '' : 'text-muted'} style={learned ? { color: accent } : undefined} />
          Learnt
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover"
        >
          <Star
            size={16}
            strokeWidth={2.5}
            fill={favorite ? accent : 'none'}
            className={favorite ? '' : 'text-muted'}
            style={favorite ? { color: accent } : undefined}
          />
          Favourite
        </button>
      </div>
    </>
  )
}
