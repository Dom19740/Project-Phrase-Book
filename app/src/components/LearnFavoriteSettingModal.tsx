import { Check } from 'lucide-react'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'

interface Props {
  onConfirm: (removeFavorite: boolean) => void
}

export function LearnFavoriteSettingModal({ onConfirm }: Props) {
  return (
    <Dialog onClose={() => onConfirm(false)} maxWidthClassName="sm:max-w-xs">
      <>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
            <Check size={18} strokeWidth={2.5} />
          </span>
          <h2 className="text-base font-bold tracking-tight text-ink">Marking phrases as learnt</h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Remove learnt phrases from your favorites? You can change this later from the Sort menu.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onConfirm(false)} className="px-4 py-2 text-sm">
            Keep
          </Button>
          <Button onClick={() => onConfirm(true)} className="px-5 py-2 text-sm">
            Remove
          </Button>
        </div>
      </>
    </Dialog>
  )
}
