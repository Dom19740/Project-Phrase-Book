import { motion } from 'motion/react'
import type { MouseEvent, ReactNode } from 'react'
import { motionSafeSpring, spatialDefault, usePrefersReducedMotion } from '../../lib/motionPresets'

interface SheetProps {
  onClose: () => void
  children: ReactNode
  maxWidthClassName?: string
  className?: string
}

/** Shared bottom-sheet shell (dialog on larger screens). See Dialog.tsx for the same split: CSS backdrop fade, spring panel entrance. */
export function Sheet({ onClose, children, maxWidthClassName = 'sm:max-w-sm', className = '' }: SheetProps) {
  const reducedMotion = usePrefersReducedMotion()
  function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
  }

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionSafeSpring(spatialDefault, reducedMotion)}
        className={`w-full min-w-0 rounded-t-3xl border-[1.5px] border-hairline bg-surface p-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom,0px))] shadow-2xl ${maxWidthClassName} sm:rounded-3xl sm:pb-5 ${className}`}
        onClick={stopPropagation}
      >
        {children}
      </motion.div>
    </div>
  )
}
