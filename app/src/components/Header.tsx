import { ChevronDown } from 'lucide-react'
import { Logo, Wordmark } from './Logo'

interface Props {
  /** False hides the language bar and the phrase list's sort/view toolbar, leaving just this header and the list. */
  chromeVisible: boolean
  onToggleChrome: () => void
}

/** Large brand header above LanguageTabs, carrying the wordmark. */
export function Header({ chromeVisible, onToggleChrome }: Props) {
  return (
    <div className="shrink-0 flex items-center gap-2 overflow-hidden bg-appbg px-4 py-3">
      <Logo size={28} className="shrink-0 text-fabpink" />
      <Wordmark size={18} oneLine />
      <button
        type="button"
        onClick={onToggleChrome}
        aria-expanded={chromeVisible}
        aria-label={chromeVisible ? 'Hide language and sort bars' : 'Show language and sort bars'}
        title={chromeVisible ? 'Hide bars' : 'Show bars'}
        className="ml-auto shrink-0 rounded-full p-2 text-muted hover:bg-surfacehover hover:text-ink active:scale-90 transition-all"
      >
        <ChevronDown
          size={20}
          strokeWidth={2.5}
          className={`transition-transform duration-200 ${chromeVisible ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  )
}
