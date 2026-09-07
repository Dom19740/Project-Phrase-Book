/**
 * Shared look for every toggle/chip control app-wide (language pills, alternate-translation
 * pills, flashcard filters): a soft grey border at rest that becomes a solid accent fill
 * when selected, matching the rest of the app's selected-pill styling.
 */
export function pillClass(selected: boolean): string {
  return `rounded-full border px-3 py-1.5 text-sm transition-all ${
    selected ? 'border-fabpink bg-fabpink text-onaccent shadow-lg shadow-fabpink/20' : 'border-hairline bg-surfacehover text-ink hover:border-fabpink'
  }`
}
