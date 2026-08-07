import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option<T> {
  value: T
  label: string
  /** Compact content shown on the closed trigger instead of `label` (e.g. an icon). Falls back to `label`. */
  shortLabel?: ReactNode
}

interface Props<T> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
  align?: 'left' | 'right'
  /** Which way the panel opens relative to the trigger. Use 'up' when the trigger sits near the bottom of the screen (e.g. a fixed bottom bar), so the panel doesn't render under the system gesture bar. */
  dropDirection?: 'down' | 'up'
}

export function PopoutSelect<T extends string | number>({
  value,
  options,
  onChange,
  className,
  align = 'right',
  dropDirection = 'down',
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const activeOption = options.find((o) => o.value === value)
  const activeTrigger = activeOption?.shortLabel ?? activeOption?.label ?? ''

  return (
    <div className={`relative shrink-0 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-sm text-ink"
      >
        <span className="flex-1 flex items-center gap-1 text-left truncate">{activeTrigger}</span>
        <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-ink" />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
              dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
            } z-50 w-48 max-h-64 overflow-y-auto rounded-2xl border border-hairline bg-surface p-1.5 shadow-xl`}
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
                className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-left ${
                  opt.value === value ? 'text-fabpink font-medium' : 'text-ink'
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
