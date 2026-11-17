import { Layers, Save, Share, SquarePlus, X } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { ANDROID_PLAY_STORE_URL, type InstallablePlatform } from '../lib/platform'

interface Props {
  platform: InstallablePlatform
  onClose: () => void
}

export function InstallPrompt({ platform, onClose }: Props) {
  return (
    <Dialog onClose={onClose} maxWidthClassName="sm:max-w-md">
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={36} className="shrink-0 text-fabpink" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-ink">
                {platform === 'ios' ? 'Add to Home Screen' : 'Get the app'}
              </h2>
              <p className="text-xs text-muted">
                {platform === 'ios'
                  ? 'To better protect your phrases.'
                  : "You're using the web app - the Android app unlocks more."}
              </p>
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

        {platform === 'ios' ? (
          <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-hairline bg-appbg p-3.5">
            <p className="flex items-center gap-2.5 text-sm text-ink">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
                <Share size={15} strokeWidth={2} />
              </span>
              Tap the <span className="font-semibold">Share</span> icon in Safari's toolbar
            </p>
            <p className="flex items-center gap-2.5 text-sm text-ink">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
                <SquarePlus size={15} strokeWidth={2} />
              </span>
              Scroll down and tap <span className="font-semibold">Add to Home Screen</span>
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-hairline bg-appbg p-3.5">
            <p className="flex items-center gap-2.5 text-sm text-ink">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
                <Save size={15} strokeWidth={2} />
              </span>
              Automatic backups to a folder you choose
            </p>
            <p className="flex items-center gap-2.5 text-sm text-ink">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fabpink/15 text-fabpink">
                <Layers size={15} strokeWidth={2} />
              </span>
              A homescreen widget for your favorite phrases
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="px-4 py-2 text-sm">
            Not now
          </Button>
          {platform === 'android' && (
            <a
              href={ANDROID_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-onaccent shadow-lg shadow-fabpink/20 active:scale-95 transition-all"
            >
              Get it on Google Play
            </a>
          )}
        </div>
      </>
    </Dialog>
  )
}
