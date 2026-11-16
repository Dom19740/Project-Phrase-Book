import { Logo, Wordmark } from './Logo'

interface Props {
  /** True once the phrase list below has scrolled past its top - shrinks this header to save space. */
  collapsed: boolean
}

/** Large brand header above LanguageTabs, carrying the wordmark. Shrinks on scroll via a plain CSS
 * transition (matching the rest of the app's existing layout transitions, e.g. the search bar's
 * width) rather than a motion spring - this is a height/padding change, not a transform/opacity one. */
export function Header({ collapsed }: Props) {
  return (
    <div
      className={`shrink-0 flex items-center gap-2 overflow-hidden bg-appbg px-4 transition-[padding] duration-200 ease-out ${
        collapsed ? 'py-1.5' : 'py-3'
      }`}
    >
      <Logo size={collapsed ? 20 : 28} className="shrink-0 text-fabpink" />
      <Wordmark size={collapsed ? 13 : 18} oneLine className="transition-[font-size] duration-200 ease-out" />
    </div>
  )
}
