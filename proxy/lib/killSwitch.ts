/** Lets translation be disabled instantly (env var flip, no deploy) if the endpoint needs to be shut off — e.g. during a suspected abuse incident. Never affects the locally stored phrasebook, only the translate/translate-bulk/translate-alternatives endpoints. */
export function isTranslationDisabled(): boolean {
  return process.env.TRANSLATION_DISABLED === 'true'
}
