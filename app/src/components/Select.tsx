import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string
}

/** A native <select> with the browser's default arrow/chrome replaced so it matches the rest of the app. */
export function Select({ className = '', wrapperClassName = '', children, ...props }: Props) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-hairline bg-surface text-ink px-3 py-2 pr-9 text-sm focus:outline-none focus:border-brandteal ${className}`}
      >
        {children}
      </select>
      <ChevronDown size={14} strokeWidth={2} className="absolute right-3 top-1/2 -translate-y-1/2 text-brandteal pointer-events-none" />
    </div>
  )
}
