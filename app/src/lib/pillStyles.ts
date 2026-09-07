/**
 * Shared look for every toggle/chip control app-wide (language pills, alternate-translation
 * pills, flashcard filters): a soft grey border at rest that becomes a thicker accent border
 * when selected, matching the rest of the app's fields and menus.
 */
export function pillClass(selected: boolean): string {
  return `rounded-full border px-3 py-1.5 text-sm transition-all ${
    selected ? 'border-2 border-fabpink text-fabpink' : 'border-hairline bg-surfacehover text-ink hover:border-fabpink'
  }`
}
