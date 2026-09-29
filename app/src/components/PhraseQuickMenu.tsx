import { Check, Pencil, Star } from 'lucide-react'

interface Props {
  open: boolean
  learned: boolean
  favorite: boolean
  onToggleLearned: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onClose: () => void
}

export function PhraseQuickMenu({ open, learned, favorite, onToggleLearned, onToggleFavorite, onEdit, onClose }: Props) {
  return (
    <div
      className="flex flex-col p-1.5"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onToggleLearned()
          onClose()
        }}
        tabIndex={open ? 0 : -1}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
      >
        <Check size={16} strokeWidth={2.5} className={learned ? 'text-fabpink' : 'text-muted'} />
        Learnt
      </button>
      <button
        type="button"
        onClick={() => {
          onToggleFavorite()
          onClose()
        }}
        tabIndex={open ? 0 : -1}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
      >
        <Star size={16} strokeWidth={2.5} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-fabpink' : 'text-muted'} />
        Favorite
      </button>
      <button
        type="button"
        onClick={() => {
          onEdit()
          onClose()
        }}
        tabIndex={open ? 0 : -1}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
      >
        <Pencil size={16} strokeWidth={2.5} className="text-muted" />
        Edit
      </button>
    </div>
  )
}