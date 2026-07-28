const STORAGE_KEY = 'phrasebook-device-id'

/** Random, anonymous per-install ID used only for the translate proxy's rate limiting — no accounts, no login. */
export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
