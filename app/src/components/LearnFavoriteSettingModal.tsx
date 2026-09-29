import { Check } from 'lucide-react'

interface Props {
  onConfirm: (removeFavorite: boolean) => void
}

export function LearnFavoriteSettingModal({ onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={() => onConfirm(false)}>
      <div
        className="w-full min-w-0 rounded-t-3xl border-[1.5px] border-hairline bg-surface p-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom,0px))] shadow-2xl sm:max-w-sm sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
            <Check size={18} strokeWidth={2.5} />
          </span>
          <h2 className="text-base font-bold tracking-tight text-ink">Marking phrases as learnt</h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Remove learnt phrases from your favorites? You can change this later from the menu.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => onConfirm(false)}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all"
          >
            Keep
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
