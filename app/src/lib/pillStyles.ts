/**
 * Shared look for every toggle/chip control app-wide (language pills, alternate-translation
 * pills, flashcard filters, category filters): a soft grey border at rest that becomes a solid
 * accent fill when selected, matching the rest of the app's selected-pill styling. The corner
 * radius morphs too (rounded-xl at rest, rounded-full once selected) - a plain CSS transition on
 * border-radius, not a motion-animated one, so it doesn't fight any Tailwind shape class.
 */
export function pillClass(selected: boolean): string {
  return `border px-3 py-1.5 text-sm transition-all ${
    selected
      ? 'rounded-full border-fabpink bg-fabpink text-onaccent shadow-lg shadow-fabpink/20'
      : 'rounded-xl border-hairline bg-surfacehover text-ink hover:border-fabpink'
  }`
}
