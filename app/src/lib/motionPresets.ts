import { useSyncExternalStore } from 'react'

export interface SpringPreset {
  type: 'spring'
  stiffness: number
  damping: number
  mass: number
}

export function springFromDampingRatio(stiffness: number, dampingRatio: number, mass = 1): SpringPreset {
  const criticalDamping = 2 * Math.sqrt(stiffness * mass)
  return { type: 'spring', stiffness, damping: dampingRatio * criticalDamping, mass }
}

// M3 Expressive motion spec spring tokens (stiffness, damping ratio):
// spatial fast 800/0.6, default 380/0.8, slow 200/0.8;
// effects (non-bouncy, damping ratio 1) fast 3800, default 1600, slow 800.
export const spatialFast = springFromDampingRatio(800, 0.6)
export const spatialDefault = springFromDampingRatio(380, 0.8)
export const spatialSlow = springFromDampingRatio(200, 0.8)
export const effectsFast = springFromDampingRatio(3800, 1)
export const effectsDefault = springFromDampingRatio(1600, 1)
export const effectsSlow = springFromDampingRatio(800, 1)

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getReducedMotionSnapshot(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

/** Re-renders the caller when the OS-level reduced-motion setting changes, unlike a one-shot matchMedia read. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, () => false)
}

export function motionSafeSpring(preset: SpringPreset, reducedMotion: boolean): SpringPreset | { duration: number } {
  return reducedMotion ? { duration: 0 } : preset
}
