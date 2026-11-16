import { motion } from 'motion/react'
import { motionSafeSpring, spatialDefault, usePrefersReducedMotion } from '../../lib/motionPresets'

interface Props {
  open: boolean
  size?: number
  className?: string
}

const REST_WIDTH = 16
const OPEN_WIDTH = 7
const BAR_HEIGHT = 2
const BAR_RADIUS = 1

// Four full-width bars stacked in one column at rest - a 4-line hamburger, not the usual 3.
// On open each bar shrinks to half-length while rotating 45deg and sliding to the middle, so
// outer bars (l1+l4) meet in the center to form one diagonal of the X and inner bars (l2+l3)
// form the other, instead of a middle bar awkwardly fading out.
const CLOSED = {
  l1: { x: 4, y: 3.5, rotate: 0, width: REST_WIDTH },
  l2: { x: 4, y: 8.5, rotate: 0, width: REST_WIDTH },
  l3: { x: 4, y: 13.5, rotate: 0, width: REST_WIDTH },
  l4: { x: 4, y: 18.5, rotate: 0, width: REST_WIDTH },
}

const OPEN = {
  l1: { x: 5.81, y: 8.31, rotate: 45, width: OPEN_WIDTH },
  l2: { x: 11.19, y: 8.31, rotate: -45, width: OPEN_WIDTH },
  l3: { x: 5.81, y: 13.69, rotate: -45, width: OPEN_WIDTH },
  l4: { x: 11.19, y: 13.69, rotate: 45, width: OPEN_WIDTH },
}

/** Animated hamburger<->X icon for the burger menu button. */
export function MenuIcon({ open, size = 20, className = '' }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const transition = motionSafeSpring(spatialDefault, reducedMotion)
  const state = open ? OPEN : CLOSED

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {(['l1', 'l2', 'l3', 'l4'] as const).map((key) => (
        <motion.rect
          key={key}
          height={BAR_HEIGHT}
          rx={BAR_RADIUS}
          fill="currentColor"
          style={{ originX: 0.5, originY: 0.5 }}
          animate={{ x: state[key].x, y: state[key].y, rotate: state[key].rotate, width: state[key].width }}
          transition={transition}
        />
      ))}
    </svg>
  )
}
