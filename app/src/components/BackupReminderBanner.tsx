import { CloudOff, X } from 'lucide-react'

interface Props {
  onBackUp: () => void
  onDismiss: () => void
  busy: boolean
}

/** Shown when there's no confirmed backup covering recent changes - e.g. web/iOS, which has no
 * silent auto-backup at all, or the native app before a backup folder's been chosen. Dismissing
 * only snoozes it for this session; it comes back next launch if the phrasebook is still unbacked-up. */
export function BackupReminderBanner({ onBackUp, onDismiss, busy }: Props) {
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-2.5 text-sm text-ink">
      <CloudOff size={16} strokeWidth={2} className="shrink-0 text-fabpink" />
      <span className="min-w-0 flex-1 text-xs leading-snug text-muted sm:text-sm">
        Your phrasebook isn't backed up on this device - back up regularly so a browser reset can't lose it.
      </span>
      <button
        onClick={onBackUp}
        disabled={busy}
        className="shrink-0 rounded-full bg-fabpink px-3 py-1.5 text-xs font-bold text-onaccent shadow-sm active:scale-95 transition-all disabled:opacity-40"
      >
        {busy ? 'Backing up...' : 'Back up now'}
      </button>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-full p-1 text-muted hover:bg-surfacehover hover:text-ink transition-colors"
        aria-label="Dismiss"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  )
}
