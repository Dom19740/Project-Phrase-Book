import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function SortDropdown<T extends string>({ value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false)
  const activeLabel = options.find((o) => o.value === value)?.label ?? ''

  return (
    <div className="relative shrink-0 w-40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm text-ink"
      >
        <span className="flex-1 text-left truncate">{activeLabel}</span>
        <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-[var(--accent)]" />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close sort menu" />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-hairline bg-surface p-1.5 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.value}
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
