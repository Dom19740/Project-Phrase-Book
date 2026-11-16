import { motion } from 'motion/react'
import type { ReactNode, CSSProperties } from 'react'
import { motionSafeSpring, spatialFast, usePrefersReducedMotion } from '../../lib/motionPresets'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  ariaLabel?: string
  selectedStyle?: CSSProperties
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

export function SegmentedControl<T extends string>({ value, onChange, options, className = '' }: SegmentedControlProps<T>) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div role="group" className={`inline-flex items-center gap-1 rounded-full border border-hairline bg-surfacehover p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            aria-label={option.ariaLabel}
            whileTap={{ scale: 0.92 }}
            transition={motionSafeSpring(spatialFast, reducedMotion)}
            style={selected ? option.selectedStyle : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selected && !option.selectedStyle ? 'bg-fabpink text-onaccent' : !selected ? 'text-muted hover:text-ink' : ''
            }`}
          >
            {option.label}
          </motion.button>
        )
      })}
    </div>
  )
}
