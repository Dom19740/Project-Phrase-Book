export interface WhatsNewEntry {
  version: string
  items: string[]
}

/**
 * Bump this (and add a new entry below) with every release that should show the "What's New"
 * sheet - keep the version in sync with android/app/build.gradle's versionName and mirror the
 * bullet points into the per-locale android/fastlane/metadata/android changelogs for the Play Store listing.
 */
export const WHATS_NEW: WhatsNewEntry = {
  version: '1.3.0',
  items: [
    'New Phonetics guide text to help you pronounce your phrases',
    'New cleaner interface',
    'General polish and bug fixes',
  ],
}
