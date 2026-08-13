import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, Check, ChevronDown, Hand, Pencil, Plus, Trash2, Volume2 } from 'lucide-react'
import { Logo } from './Logo'

interface Props {
  onFinish: () => void
}

interface HowToPage {
  title: string
  body: string
  illustration: ReactNode
}

const HOWTO_PAGES: HowToPage[] = [
  {
    title: 'Add your languages',
    body: 'Tap the language selector to switch between phrase books, or add a brand-new language whenever you need one.',
    illustration: (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex w-full max-w-xs items-center gap-3 rounded-full border-4 border-fabpink bg-surface px-6 py-4 shadow-lg shadow-fabpink/20">
          <span className="text-3xl leading-none" aria-hidden="true">
            🇫🇷
          </span>
          <span className="flex-1 text-xl font-bold text-ink">French</span>
          <ChevronDown size={26} strokeWidth={2.5} className="text-fabpink" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-fabpink px-5 py-2.5 text-base font-bold text-white shadow-lg shadow-fabpink/20">
          <Plus size={18} strokeWidth={2.5} />
          Add language
        </div>
      </div>
    ),
  },
  {
    title: 'Add the phrases you want',
    body: 'Tap the + button to add a phrase in your own words. Tap a phrase to hear it, mark it learned, or make it a favourite.',
    illustration: (
      <div className="flex w-full flex-col items-center gap-5">
        <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 border-hairline bg-surface px-4 py-3.5 shadow-md">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surfacehover text-fabpink">
            <Volume2 size={20} strokeWidth={2} />
          </span>
          <span className="flex-1 text-lg leading-tight">
            <span className="text-muted">Hello </span>
            <span className="font-bold text-ink">Bonjour</span>
          </span>
          <Check size={22} strokeWidth={2.5} className="text-fabpink" />
        </div>
        <div className="flex size-16 items-center justify-center rounded-full bg-fabpink text-white shadow-lg shadow-black/30">
          <Plus size={30} strokeWidth={2.5} />
        </div>
      </div>
    ),
  },
  {
    title: 'Edit or delete a phrase',
    body: 'Long-press a phrase to open it up — fix a typo, change its category, or delete it for good.',
    illustration: (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="relative flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 border-dashed border-fabpink bg-surface px-4 py-3.5 shadow-md">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surfacehover text-fabpink">
            <Volume2 size={20} strokeWidth={2} />
          </span>
          <span className="flex-1 text-lg leading-tight">
            <span className="text-muted">Hello </span>
            <span className="font-bold text-ink">Bonjour</span>
          </span>
          <Check size={22} strokeWidth={2.5} className="text-fabpink" />
          <span className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full bg-fabpink text-white shadow-lg shadow-fabpink/30">
            <Hand size={16} strokeWidth={2.5} />
          </span>
        </div>
        <ArrowDown size={20} strokeWidth={2.5} className="text-muted" />
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <span className="flex size-12 items-center justify-center rounded-full border-2 border-hairline bg-surface text-ink shadow-sm">
              <Pencil size={20} strokeWidth={2} />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Edit</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="flex size-12 items-center justify-center rounded-full border-2 border-red-800 bg-surface text-red-400 shadow-sm">
              <Trash2 size={20} strokeWidth={2} />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Delete</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Add more languages and phrases',
    body: "Heading somewhere new? Add another language and every phrase you've already built gets translated and added automatically — nothing to retype.",
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
]

const TOTAL_PAGES = HOWTO_PAGES.length + 1

export function OnboardingFlow({ onFinish }: Props) {
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  function goTo(next: number) {
    setDirection(next > page ? 'forward' : 'back')
    setPage(next)
  }

  const isLast = page === TOTAL_PAGES - 1

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-appbg pt-[var(--safe-area-inset-top,0px)] pb-[var(--safe-area-inset-bottom,0px)]">
      <div className="flex h-10 shrink-0 justify-end px-4 pt-3">
        {!isLast && (
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
        className="animate-onboarding-slide flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4"
        style={{ '--slide-from': direction === 'forward' ? '24px' : '-24px' } as React.CSSProperties}
      >
        {page === 0 ? (
          <div className="relative flex w-full max-w-sm flex-col items-center text-center">
            <div
              className="absolute -top-16 left-1/2 size-72 -translate-x-1/2 rounded-full bg-fabpink/[0.08] blur-[110px]"
              aria-hidden="true"
            />
            <Logo size={72} className="relative text-fabpink" />
            <h1 className="relative mt-4 text-4xl font-black leading-none tracking-tight text-ink">
              Travel <span className="text-fabpink">Chatter</span>
            </h1>
            <p className="relative mt-5 text-lg font-semibold leading-snug text-ink">
              Build your own phrase book to chat with locals as you travel.
            </p>
            <p className="relative mt-4 text-sm leading-relaxed text-muted">
              Want to be able to chat with locals: 'How are you?', 'Nice to meet you.'', 'One more beer please' but don't need to know
              all that useless stuff like asking where the library is or saying the cat is in the garage? All the phrases you want to learn and none of the ones you don't. Your language, your way.
            </p>
            <p className="relative mt-3 text-sm font-bold leading-relaxed text-ink">
              Get chatting with the locals while you travel, <span className="text-fabpink">instantly</span>.
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col items-center text-center">
            <h2 className="text-2xl font-black tracking-tight text-ink">{HOWTO_PAGES[page - 1].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{HOWTO_PAGES[page - 1].body}</p>
            <div className="mt-8 w-full">{HOWTO_PAGES[page - 1].illustration}</div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-4 px-6 pb-6 pt-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-fabpink' : 'w-1.5 bg-hairline'}`}
            />
          ))}
        </div>

        <div className="flex w-full items-center gap-2">
          {page > 0 && (
            <button
              onClick={() => goTo(page - 1)}
              className="h-11 shrink-0 rounded-full border border-hairline px-5 text-sm font-semibold text-ink hover:bg-surfacehover active:scale-95 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? onFinish() : goTo(page + 1))}
            className="h-11 flex-1 rounded-full bg-fabpink text-sm font-bold text-white shadow-lg shadow-fabpink/20 active:scale-[0.98] transition-all"
          >
            {isLast ? "Let's go" : page === 0 ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
