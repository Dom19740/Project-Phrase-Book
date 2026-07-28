import { Check } from 'lucide-react'
import { COLOR_PALETTE } from '../lib/colorPalette'

interface Props {
  value: string
  onChange: (color: string) => void
}

/** A row of selectable color swatches — the "color bar" used to assign a language's accent color. */
export function ColorSwatchBar({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Choose color ${color}`}
            className="flex size-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition-transform hover:scale-110"
            style={{ backgroundColor: color, '--tw-ring-color': selected ? '#FFFFFF' : 'transparent' } as React.CSSProperties}
          >
            {selected && <Check size={16} strokeWidth={3} className="text-white" />}
          </button>
        )
      })}
    </div>
  )
}
