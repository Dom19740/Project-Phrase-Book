// A curated set of accent colors a language can be assigned, tuned to stay readable
// as text/border color against the app's near-black background.
export const COLOR_PALETTE = [
  '#207781', // teal (app default)
  '#2563EB', // blue
  '#16A34A', // green
  '#DC2626', // red
  '#D97706', // amber
  '#7C3AED', // violet
  '#DB2777', // pink
  '#0891B2', // cyan
  '#65A30D', // lime
  '#EA580C', // orange
]

export const DEFAULT_LANGUAGE_COLOR = COLOR_PALETTE[0]

/** First palette color not already used by an existing language, falling back to the first color if all are taken. */
export function nextAvailableColor(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()))
  return COLOR_PALETTE.find((c) => !used.has(c.toLowerCase())) ?? COLOR_PALETTE[0]
}
