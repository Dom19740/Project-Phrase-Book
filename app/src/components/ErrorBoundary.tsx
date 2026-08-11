import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/** Catches uncaught render/effect errors anywhere below it so a bug never presents to the user as a blank white screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Uncaught error, showing fallback UI:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-appbg px-6 text-center text-ink">
          <p className="text-lg font-semibold">Something went wrong.</p>
          <p className="text-sm text-muted">Your saved phrasebook is unaffected. Try reloading the app.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-fabpink px-5 py-2 text-sm font-medium text-white shadow-sm"
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
