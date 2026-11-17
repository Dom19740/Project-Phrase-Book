import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef } from 'react'
import { motionSafeSpring, spatialFast, usePrefersReducedMotion } from '../../lib/motionPresets'

export type ButtonVariant = 'filled' | 'outline'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: 'bg-fabpink text-onaccent shadow-lg shadow-fabpink/20 hover:brightness-110 disabled:opacity-40',
  outline: 'border border-hairline text-ink hover:bg-surfacehover disabled:opacity-30',
}

/**
 * Shared pill button: press springs the scale down and back, instead of the plain
 * `active:scale-95` every button used to hand-roll. Deliberately does not animate borderRadius -
 * Framer Motion takes over any style property it's given a target for, which fights the
 * `rounded-full` class and can leave the button looking square instead of pill-shaped.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'filled', className = '', children, ...props }, ref) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={motionSafeSpring(spatialFast, reducedMotion)}
      className={`rounded-full font-semibold transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
})
