import { motion } from 'motion/react'
import type { MouseEvent, ReactNode } from 'react'
import { motionSafeSpring, spatialDefault, usePrefersReducedMotion } from '../../lib/motionPresets'

interface DialogProps {
  onClose: () => void
  children: ReactNode
  maxWidthClassName?: string
  className?: string
  /** Some forms (Add/Edit phrase) deliberately ignore a backdrop tap so typed-in-progress text isn't lost - set false to keep that. */
  dismissOnBackdropClick?: boolean
  /** EditPhraseModal stacks above AddPhraseModal/other z-50 overlays - override when this dialog needs to sit higher. */
  zIndexClassName?: string
}

/**
 * Shared centered-dialog shell: backdrop + panel, replacing the backdrop+panel JSX every
 * modal used to hand-roll. Panel entrance is a spring (matching the old animate-modal-panel
 * keyframe's shape) instead of a CSS keyframe; the backdrop fade stays CSS since it's a plain
 * opacity fade with no shape to fight.
 */
export function Dialog({
  onClose,
  children,
  maxWidthClassName = 'sm:max-w-sm',
  className = '',
  dismissOnBackdropClick = true,
  zIndexClassName = 'z-50',
}: DialogProps) {
  const reducedMotion = usePrefersReducedMotion()
  function stopPropagation(event: MouseEvent) {
    event.stopPropagation()
  }

  return (
    <div
      className={`animate-modal-backdrop fixed inset-0 ${zIndexClassName} flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-16 pb-[var(--safe-area-inset-bottom,0px)] sm:pt-24`}
      onClick={dismissOnBackdropClick ? onClose : undefined}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={motionSafeSpring(spatialDefault, reducedMotion)}
        className={`w-full min-w-0 ${maxWidthClassName} rounded-2xl border-[1.5px] border-hairline bg-surface p-5 shadow-2xl mx-4 sm:mx-0 ${className}`}
        onClick={stopPropagation}
      >
        {children}
      </motion.div>
    </div>
  )
}
