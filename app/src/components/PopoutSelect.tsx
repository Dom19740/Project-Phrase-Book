import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option<T> {
  value: T
  label: string
}

interface Props<T> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
  align?: 'left' | 'right'
}

export function PopoutSelect<T extends string | number>({ value, options, onChange, className, align = 'right' }: Props<T>) {
  const [open, setOpen] = useState(false)
  const activeLabel = options.find((o) => o.value === value)?.label ?? ''

  return (
    <div className={`relative shrink-0 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-sm text-ink"
      >
        <span className="flex-1 text-left truncate">{activeLabel}</span>
        <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-[var(--accent)]" />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } top-full z-50 mt-2 w-48 max-h-64 overflow-y-auto rounded-2xl border border-hairline bg-surface p-1.5 shadow-xl`}
          >
            {options.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-left ${
                  opt.value === value ? 'text-[var(--accent)] font-medium' : 'text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
