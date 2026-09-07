import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, Star } from 'lucide-react'

interface Props {
  /** The row this menu was opened from — used to position the menu against it via a portal, so it
   * can render above the scrolling phrase list instead of being clipped by it. */
  anchorRef: RefObject<HTMLElement | null>
  learned: boolean
  favorite: boolean
  onToggleLearned: () => void
  onToggleFavorite: () => void
  onClose: () => void
}

const MARGIN = 8

export function PhraseQuickMenu({ anchorRef, learned, favorite, onToggleLearned, onToggleFavorite, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    const menu = menuRef.current
    if (!anchor || !menu) return
    const anchorRect = anchor.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()

    // Flip to whichever side has more room, so the menu stays fully visible for rows at the very
    // top or bottom of the list instead of running off past the viewport edge.
    const spaceBelow = window.innerHeight - anchorRect.bottom
    const spaceAbove = anchorRect.top
    const openBelow = spaceBelow >= menuRect.height + MARGIN || spaceBelow >= spaceAbove
    const top = openBelow
      ? Math.min(anchorRect.bottom + MARGIN, window.innerHeight - menuRect.height - MARGIN)
      : Math.max(anchorRect.top - menuRect.height - MARGIN, MARGIN)

    const left = Math.min(Math.max(anchorRect.right - menuRect.width, MARGIN), window.innerWidth - menuRect.width - MARGIN)

    setPosition({ top, left })
  }, [anchorRef])

  return createPortal(
    <>
      <button
        className="fixed inset-0 z-40 cursor-default"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close menu"
      />
      <div
        ref={menuRef}
        style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
        className="fixed z-50 w-40 rounded-2xl border border-hairline bg-surface p-1.5 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            onToggleLearned()
            onClose()
          }}
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
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left text-ink hover:bg-surfacehover transition-colors"
        >
          <Star size={16} strokeWidth={2.5} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-fabpink' : 'text-muted'} />
          Favorite
        </button>
      </div>
    </>,
    document.body,
  )
}
