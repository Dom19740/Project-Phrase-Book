import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option<T> {
  value: T
  label: string
  /** Compact content shown on the closed trigger instead of `label` (e.g. an icon). Falls back to `label`. */
  shortLabel?: ReactNode
  /** Skip the accent-color highlight when this option is active — for action rows (e.g. "+ New category...") that shouldn't be tinted by whatever accent color is selected. */
  neutral?: boolean
}

interface Props<T> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
  align?: 'left' | 'right'
  /** Which way the panel opens relative to the trigger. Use 'up' when the trigger sits near the bottom of the screen (e.g. a fixed bottom bar), so the panel doesn't render under the system gesture bar. */
  dropDirection?: 'down' | 'up'
  /** Width utility class for the dropdown panel. Defaults to a fixed w-48 (right for text-label
   * options); pass 'w-max' for compact icon-only option lists so the panel shrinks to fit them
   * instead of leaving a lot of empty space. */
  panelWidthClassName?: string
  /** Gives the trigger a solid accent border instead of the default hairline, matching the other filter pills. */
  accent?: boolean
  /** Shrinks the trigger to the same height/text size as the other filter pills (px-2.5 py-1.5 text-xs). */
  dense?: boolean
  /** Static icon shown before the active option on the closed trigger, e.g. to label what the control does. */
  icon?: ReactNode
}

export function PopoutSelect<T extends string | number>({
  value,
  options,
  onChange,
  className,
  align = 'right',
  dropDirection = 'down',
  panelWidthClassName = 'w-48',
  accent = false,
  dense = false,
  icon,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const activeOption = options.find((o) => o.value === value)
  const activeTrigger = activeOption?.shortLabel ?? activeOption?.label ?? ''

  return (
    <div className={`relative shrink-0 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-1.5 rounded-full active:scale-[0.98] transition-all ${
          dense ? 'px-2.5 py-1.5 text-xs font-medium' : 'px-3.5 py-2 text-sm'
        } ${
          accent
            ? 'bg-fabpink text-onaccent shadow-lg shadow-fabpink/20'
            : `bg-surface text-ink ${open ? 'border-2 border-fabpink' : 'border border-hairline hover:border-fabpink/40'}`
        }`}
      >
        {icon}
        <span className="flex-1 min-w-0 flex items-center gap-1 text-left truncate">{activeTrigger}</span>
        <ChevronDown size={14} strokeWidth={2} className={`shrink-0 ${accent ? 'text-onaccent' : 'text-ink'}`} />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
              dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
            } z-50 ${panelWidthClassName} max-h-64 overflow-y-auto rounded-2xl border border-hairline bg-surface p-1.5 shadow-xl`}
          >
            {options.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                title={opt.label}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-left hover:bg-surfacehover transition-colors ${
                  opt.value === value && !opt.neutral ? 'text-fabpink font-medium' : 'text-ink'
                }`}
              >
                {opt.shortLabel ? (
                  <>
                    {opt.shortLabel}
                    <span className="sr-only">{opt.label}</span>
                  </>
                ) : (
                  opt.label
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
