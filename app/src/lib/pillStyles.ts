export type PillVariant = 'muted' | 'accent'

/**
 * Shared look for every toggle/chip control app-wide: a pill (always fully rounded, never a
 * rectangular rest state) that becomes a solid accent fill when selected. `variant` controls the
 * unselected border/background - 'muted' (default) is the soft grey border used by category and
 * language filters; 'accent' is the colored-border, small-caps pill used by the Sort/View option
 * rows and the View/Bulk trigger buttons.
 */
export function pillClass(selected: boolean, variant: PillVariant = 'muted'): string {
  if (variant === 'accent') {
    const base = 'rounded-full border px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition-all'
    return selected
      ? `${base} border-fabpink bg-fabpink text-onaccent shadow-lg shadow-fabpink/20`
      : `${base} border-fabpink bg-transparent text-fabpink hover:bg-fabpink/10`
  }
  const base = 'rounded-full border px-3 py-1.5 text-sm transition-all'
  return selected
    ? `${base} border-fabpink bg-fabpink text-onaccent shadow-lg shadow-fabpink/20`
    : `${base} border-hairline bg-surfacehover text-ink hover:border-fabpink`
}
