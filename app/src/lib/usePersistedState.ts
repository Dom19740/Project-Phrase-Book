import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/** Like useState, but the value survives reloads/app restarts via localStorage. */
export function usePersistedState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // localStorage unavailable (e.g. private browsing quota) — persistence just silently no-ops
    }
  }, [key, state])

  return [state, setState]
}
