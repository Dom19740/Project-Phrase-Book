import { ChevronDown } from 'lucide-react'
import { Logo, Wordmark } from './Logo'

interface Props {
  /** True once the phrase list below has scrolled past its top - shrinks this header to save space. */
  collapsed: boolean
  /** False hides the language bar and the phrase list's sort/view toolbar, leaving just this header and the list. */
  chromeVisible: boolean
  onToggleChrome: () => void
}

/** Large brand header above LanguageTabs, carrying the wordmark. Shrinks on scroll via a plain CSS
 * transition (matching the rest of the app's existing layout transitions, e.g. the search bar's
 * width) rather than a motion spring - this is a height/padding change, not a transform/opacity one. */
export function Header({ collapsed, chromeVisible, onToggleChrome }: Props) {
  return (
    <div
      className={`shrink-0 flex items-center gap-2 overflow-hidden bg-appbg px-4 transition-[padding] duration-200 ease-out ${
        collapsed ? 'py-1.5' : 'py-3'
      }`}
    >
      <Logo size={collapsed ? 20 : 28} className="shrink-0 text-fabpink" />
      <Wordmark size={collapsed ? 13 : 18} oneLine className="transition-[font-size] duration-200 ease-out" />
      <button
        type="button"
        onClick={onToggleChrome}
        aria-expanded={chromeVisible}
        aria-label={chromeVisible ? 'Hide language and sort bars' : 'Show language and sort bars'}
        title={chromeVisible ? 'Hide bars' : 'Show bars'}
        className="ml-auto shrink-0 rounded-full p-2 text-muted hover:bg-surfacehover hover:text-ink active:scale-90 transition-all"
      >
        <ChevronDown
          size={collapsed ? 16 : 20}
          strokeWidth={2.5}
          className={`transition-transform duration-200 ${chromeVisible ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  )
}
