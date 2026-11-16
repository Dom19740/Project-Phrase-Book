import { motion } from 'motion/react'
import { Check, Pencil, Star } from 'lucide-react'
import { motionSafeSpring, spatialDefault, usePrefersReducedMotion } from '../lib/motionPresets'

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
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div
      className={`flex flex-col p-1.5 ${open ? 'animate-menu-open' : ''}`}
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
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left font-medium text-fabpink hover:bg-surfacehover transition-colors"
      >
        <motion.span key={learned ? 'learned' : 'not-learned'} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={motionSafeSpring(spatialDefault, reducedMotion)} className="inline-flex">
          <Check size={16} strokeWidth={2.5} className="text-ink" />
        </motion.span>
        Learnt
      </button>
      <button
        type="button"
        onClick={() => {
          onToggleFavorite()
          onClose()
        }}
        tabIndex={open ? 0 : -1}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left font-medium text-fabpink hover:bg-surfacehover transition-colors"
      >
        <motion.span key={favorite ? 'favorite' : 'not-favorite'} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={motionSafeSpring(spatialDefault, reducedMotion)} className="inline-flex">
          <Star size={16} strokeWidth={2.5} fill="none" className="text-ink" />
        </motion.span>
        Favorite
      </button>
      <button
        type="button"
        onClick={() => {
          onEdit()
          onClose()
        }}
        tabIndex={open ? 0 : -1}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left font-medium text-fabpink hover:bg-surfacehover transition-colors"
      >
        <Pencil size={16} strokeWidth={2.5} className="text-ink" />
        Edit
      </button>
    </div>
  )
}