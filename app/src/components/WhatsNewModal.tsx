import { Sparkles, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import type { WhatsNewEntry } from '../lib/whatsNew'

interface Props {
  entry: WhatsNewEntry
  onClose: () => void
}

export function WhatsNewModal({ entry, onClose }: Props) {
  return (
    <Dialog onClose={onClose} maxWidthClassName="sm:max-w-md">
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={36} className="shrink-0 text-fabpink" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-ink">{`What's New in ${entry.version}`}</h2>
              <p className="text-xs text-muted">Here's what changed in this update.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surfacehover hover:text-ink transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-hairline bg-appbg p-3.5">
          {entry.items.map((item) => (
            <p key={item} className="flex items-start gap-2.5 text-sm text-ink">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
                <Sparkles size={13} strokeWidth={2} />
              </span>
              {item}
            </p>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} className="px-5 py-2 text-sm">
            Got it
          </Button>
        </div>
      </>
    </Dialog>
  )
}
