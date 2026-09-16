import { Layers, Save, Share, SquarePlus, X } from 'lucide-react'
import { Logo } from './Logo'
import { ANDROID_PLAY_STORE_URL, type InstallablePlatform } from '../lib/platform'

interface Props {
  platform: InstallablePlatform
  onClose: () => void
}

export function InstallPrompt({ platform, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full min-w-0 rounded-t-3xl border border-hairline bg-surface p-5 pb-[calc(1.25rem+var(--safe-area-inset-bottom,0px))] shadow-2xl sm:max-w-sm sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={36} className="shrink-0 text-fabpink" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-ink">
                {platform === 'ios' ? 'Add to Home Screen' : 'Get the app'}
              </h2>
              <p className="text-xs text-muted">
                {platform === 'ios'
                  ? 'Launch it like an app, and keep your phrasebooks safer on this device.'
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
          <button
            onClick={onClose}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-surfacehover active:scale-95 transition-all"
          >
            Not now
          </button>
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
      </div>
    </div>
  )
}
