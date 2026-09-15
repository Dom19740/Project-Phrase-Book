import { useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, Eye, Layers, ListChecks, ListFilter, Mic, Pencil, Search, Star, Tag, Volume2 } from 'lucide-react'
import { Logo, Wordmark } from './Logo'

interface Props {
  onFinish: () => void
}

interface HowToPage {
  title: string
  body: string | string[]
  illustration: ReactNode
}

const HOWTO_PAGES: HowToPage[] = [
  {
    title: 'Add your language',
    body: 'Tap the language selector to add one of dozens of languages. Adding your first language offers a curated set of starter phrases to get you started.',
    illustration: (
      <div className="flex w-full flex-col items-center gap-2">
        <div className="w-full max-w-xs rounded-2xl border-2 border-fabpink bg-surface p-3 text-left shadow-lg shadow-fabpink/10">
          <p className="mb-2 text-sm font-bold text-ink">Add language</p>
          <div className="mb-2 flex items-center gap-2 rounded-full border-2 border-hairline px-3 py-1.5">
            <Search size={14} strokeWidth={2} className="shrink-0 text-muted" />
            <span className="text-xs text-muted">Search languages</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              ['🇪🇸', 'Spanish'],
              ['🇮🇹', 'Italian'],
              ['🇩🇪', 'German'],
            ].map(([flag, name]) => (
              <div key={name} className="flex items-center gap-2 rounded-lg px-2 py-1">
                <span className="text-base leading-none" aria-hidden="true">
                  {flag}
                </span>
                <span className="text-xs font-semibold text-ink">{name}</span>
              </div>
            ))}
          </div>
        </div>
        <ArrowDown size={14} strokeWidth={2.5} className="text-muted" />
        <div className="w-full max-w-xs rounded-2xl border-2 border-fabpink bg-surface p-3 text-left shadow-lg shadow-fabpink/10">
          <p className="mb-2 text-sm font-bold text-ink">Add starter phrases?</p>
          <div className="flex flex-col gap-0.5">
            {['My name is...', 'Nice to meet you.', 'Thank you everyone.'].map((phrase) => (
              <div key={phrase} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-ink">
                <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full border border-fabpink/40" />
                <span className="min-w-0 flex-1 truncate">{phrase}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Capture your phrases',
    body: [
      'Tap the + button, add a phrase, type or have a local speak the translation, or use Auto translate to show the default translation and alternatives.',
    ],
    illustration: (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="w-full max-w-xs rounded-3xl border-2 border-fabpink bg-surface p-4 text-left shadow-xl shadow-fabpink/10">
          <p className="mb-3 text-base font-bold text-ink">Add phrase</p>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-fabpink">English</p>
          <div className="mb-3 rounded-xl border-2 border-hairline px-3 py-2 text-sm text-ink">Nice to meet you.</div>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-fabpink">Translate into</p>
          <div className="mb-3 flex items-center gap-1.5 rounded-full border-2 border-hairline px-3 py-2 text-sm text-ink">
            <span aria-hidden="true">🇫🇷</span>
            French
            <ChevronDown size={14} strokeWidth={2} className="ml-auto shrink-0 text-muted" />
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border-2 border-hairline px-3 py-2 text-sm text-muted">
            <span className="flex-1">Type or record translation</span>
            <Mic size={16} strokeWidth={2} className="shrink-0 text-muted" />
          </div>
          <div className="flex justify-end">
            <span className="rounded-full bg-fabpink px-4 py-2 text-sm font-bold text-onaccent shadow-lg shadow-fabpink/20">
              Auto translate
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Filter, sort, and select',
    body: "Tap Categories to filter or group your list. Cycle through Learnt or Not Learnt phrases, Select bulk actions, and sort or reorder however you like.",
    illustration: (
      <div className="flex w-full flex-col items-center gap-2">
        <div className="flex w-full max-w-xs flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-fabpink px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-onaccent shadow-lg shadow-fabpink/20">
            <Tag size={13} strokeWidth={2.5} />
            Categories
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-fabpink px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-onaccent shadow-lg shadow-fabpink/20">
            <Eye size={13} strokeWidth={2.5} />
            Not Learnt
          </span>
        </div>
        <div className="flex w-full max-w-xs flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-fabpink px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-onaccent shadow-lg shadow-fabpink/20">
            <ListChecks size={13} strokeWidth={2.5} />
            Select
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-fabpink px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-onaccent shadow-lg shadow-fabpink/20">
            <ListFilter size={13} strokeWidth={2.5} />
            Sort
            <ChevronDown size={12} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    ),
  },
  {
    title: 'Learnt, favorite, or edit',
    body: ['Tap a phrase to mark it learnt, a favorite, or edit it. Long-press for a shortcut straight to editing.',
          "Tap the speaker icon to hear a phrase read aloud. Tap it again right after to hear it again, slower.",],
    illustration: (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 border-fabpink bg-surface px-4 py-3.5 shadow-lg shadow-fabpink/20">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surfacehover text-fabpink">
            <Volume2 size={20} strokeWidth={2} />
          </span>
          <span className="flex-1 text-lg leading-tight">
            <span className="text-muted">Hello </span>
            <span className="font-bold text-ink">Bonjour</span>
          </span>
        </div>
        <ArrowDown size={18} strokeWidth={2.5} className="text-muted" />
        <div className="flex w-44 flex-col gap-1 rounded-2xl border-2 border-hairline bg-surface p-1.5 shadow-md">
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink">
            <Check size={16} strokeWidth={2.5} className="text-fabpink" />
            Learnt
          </div>
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink">
            <Star size={16} strokeWidth={2.5} className="text-fabpink" />
            Favorite
          </div>
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink">
            <Pencil size={16} strokeWidth={2.5} className="text-muted" />
            Edit
          </div>
        </div>
      </div>
    ),
  },

  {
    title: 'Add more languages and phrases',
    body: "Heading somewhere new? Add another language and every phrase you've already built gets translated and added automatically.",
    illustration: (
      <div className="flex w-full items-center justify-center gap-3">
        <div className="flex max-w-[9.5rem] flex-1 items-center justify-center gap-2 rounded-full border-2 border-hairline bg-surface px-4 py-3 shadow-sm">
          <span className="text-2xl leading-none" aria-hidden="true">
            🇫🇷
          </span>
          <span className="text-base font-bold text-ink">French</span>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
          <ArrowRight size={18} strokeWidth={2.5} />
        </span>
        <div className="flex max-w-[9.5rem] flex-1 items-center justify-center gap-2 rounded-full border-2 border-fabpink bg-surface px-4 py-3 shadow-lg shadow-fabpink/20">
          <span className="text-2xl leading-none" aria-hidden="true">
            🇪🇸
          </span>
          <span className="text-base font-bold text-ink">Spanish</span>
        </div>
      </div>
    ),
  },
   {
    title: 'Practice with flash cards',
    body: 'Open the menu and tap Flash Cards to start a session - pick a language and filter, then tap a card to flip between English and the translation. Long-press a card to edit it.',
    illustration: (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="flex w-full max-w-xs items-center gap-2.5 rounded-xl border-2 border-fabpink bg-surface px-3 py-2.5 shadow-lg shadow-fabpink/20">
          <Layers size={18} strokeWidth={2} className="text-fabpink" />
          <span className="text-sm font-semibold text-ink">Flash Cards</span>
        </div>
        <ArrowDown size={18} strokeWidth={2.5} className="text-muted" />
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl border-2 border-fabpink/40 bg-surface px-6 py-7 shadow-xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Tap to reveal</span>
          <span className="text-xl font-bold text-ink">Bonjour</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Add the home screen widget',
    body: 'Long-press your home screen, tap Widgets, and add Travel Chatter to see your favorites or not-learnt phrases at a glance. Tap the language to cycle it, the filter pill to switch lists, and a phrase to hear it spoken aloud.',
    illustration: (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="w-full max-w-xs rounded-2xl border-2 border-hairline bg-surface p-2.5 shadow-md">
          <div className="flex items-center gap-1.5 pb-2">
            <span className="flex items-center gap-1 rounded-full border-2 border-fabpink bg-surface px-2.5 py-1 text-xs font-bold text-ink">
              <span aria-hidden="true">🇫🇷</span> French
            </span>
            <span className="rounded-full bg-fabpink px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-onaccent">
              Favorites
            </span>
            <span className="ml-auto flex size-6 shrink-0 items-center justify-center">
              <Logo size={16} className="text-fabpink" />
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded-xl bg-surfacehover px-3 py-2">
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[10px] text-muted">Hello</p>
                <p className="truncate text-sm font-bold text-ink">Bonjour</p>
              </div>
              <Star size={14} strokeWidth={2.5} className="shrink-0 text-fabpink" fill="currentColor" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surfacehover px-3 py-2">
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[10px] text-muted">Thank you</p>
                <p className="truncate text-sm font-bold text-ink">Merci</p>
              </div>
              <Check size={14} strokeWidth={2.5} className="shrink-0 text-fabpink" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

const TOTAL_PAGES = HOWTO_PAGES.length + 1

function toParagraphs(body: string | string[]): string[] {
  return Array.isArray(body) ? body : [body]
}

export function OnboardingFlow({ onFinish }: Props) {
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function goTo(next: number) {
    setDirection(next > page ? 'forward' : 'back')
    setPage(next)
  }

  const isLast = page === TOTAL_PAGES - 1

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return

    if (deltaX < 0 && page < TOTAL_PAGES - 1) {
      goTo(page + 1)
    } else if (deltaX > 0 && page > 0) {
      goTo(page - 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-appbg pt-[var(--safe-area-inset-top,0px)] pb-[var(--safe-area-inset-bottom,0px)]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-4 pt-3">
        {page > 0 ? (
          <p className="text-xs font-semibold text-muted">
            {page} / {HOWTO_PAGES.length}
          </p>
        ) : (
          <span />
        )}
        {page > 0 && !isLast && (
          <button
            onClick={onFinish}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:text-ink active:scale-95 transition-all"
          >
            Skip
          </button>
        )}
      </div>

      <div
        key={page}
        className="animate-slide-in flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4"
        style={{ '--slide-from': direction === 'forward' ? '24px' : '-24px' } as React.CSSProperties}
      >
        {page === 0 ? (
          <div className="relative flex w-full max-w-sm flex-col items-center text-center">
            <div
              className="absolute -top-16 left-1/2 size-72 -translate-x-1/2 rounded-full bg-fabpink/[0.08] blur-[110px]"
              aria-hidden="true"
            />
            <Logo size={72} className="relative text-fabpink" />
            <Wordmark size={28} className="relative mt-4 text-ink" />
            <p className="relative mt-4 font-brand text-xs font-semibold uppercase tracking-[0.26em] text-muted">
              The phrasebook you write
            </p>

            <p className="relative mt-5 text-sm leading-relaxed text-muted">
              Capture a phrase and translate it into any language. Hear it, learn it and practice using it the next time you meet someone new and get chatting like a local. A phrasebook that only contains {' '}what you choose to put in it.
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <h2 className="font-brand text-2xl font-bold tracking-[-0.035em] text-ink">{HOWTO_PAGES[page - 1].title}</h2>
            {toParagraphs(HOWTO_PAGES[page - 1].body).map((paragraph, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
            <div className="mt-8 w-full">{HOWTO_PAGES[page - 1].illustration}</div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 px-6 pb-6 pt-2">
        {page > 0 && (
          <div className="flex items-center gap-1.5">
            {HOWTO_PAGES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === page - 1 ? 'w-6 bg-fabpink' : 'w-1.5 bg-hairline'}`}
              />
            ))}
          </div>
        )}

        <div className="flex w-full items-center justify-center gap-2">
          {page === 0 ? (
            <>
              <button
                onClick={onFinish}
                className="h-11 shrink-0 rounded-full border-2 border-fabpink px-6 text-sm font-bold text-fabpink active:scale-95 transition-all"
              >
                Get Started
              </button>
              <button
                onClick={() => goTo(1)}
                className="h-11 shrink-0 rounded-full bg-fabpink px-6 text-sm font-bold text-onaccent shadow-lg shadow-fabpink/20 active:scale-[0.98] transition-all"
              >
                How to Use
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => goTo(page - 1)}
                className="h-11 shrink-0 rounded-full border border-hairline px-5 text-sm font-semibold text-ink hover:bg-surfacehover active:scale-95 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => (isLast ? onFinish() : goTo(page + 1))}
                className="h-11 shrink-0 rounded-full bg-fabpink px-10 text-sm font-bold text-onaccent shadow-lg shadow-fabpink/20 active:scale-[0.98] transition-all"
              >
                {isLast ? "Let's go" : 'Next'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
