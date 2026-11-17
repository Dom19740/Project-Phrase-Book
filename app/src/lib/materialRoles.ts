export const MATERIAL_ROLE_KEYS = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'surface',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'error',
  'onError',
] as const

export type MaterialRoleKey = (typeof MATERIAL_ROLE_KEYS)[number]

export type MaterialRoleArgbMap = Record<MaterialRoleKey, number>

export const MATERIAL_ROLE_CSS_VARS: Record<MaterialRoleKey, string> = {
  primary: '--md-primary',
  onPrimary: '--md-on-primary',
  primaryContainer: '--md-primary-container',
  onPrimaryContainer: '--md-on-primary-container',
  secondary: '--md-secondary',
  onSecondary: '--md-on-secondary',
  secondaryContainer: '--md-secondary-container',
  onSecondaryContainer: '--md-on-secondary-container',
  tertiary: '--md-tertiary',
  onTertiary: '--md-on-tertiary',
  tertiaryContainer: '--md-tertiary-container',
  onTertiaryContainer: '--md-on-tertiary-container',
  surface: '--md-surface',
  surfaceContainerLowest: '--md-surface-container-lowest',
  surfaceContainerLow: '--md-surface-container-low',
  surfaceContainer: '--md-surface-container',
  surfaceContainerHigh: '--md-surface-container-high',
  surfaceContainerHighest: '--md-surface-container-highest',
  onSurface: '--md-on-surface',
  onSurfaceVariant: '--md-on-surface-variant',
  outline: '--md-outline',
  outlineVariant: '--md-outline-variant',
  error: '--md-error',
  onError: '--md-on-error',
}

export function hexFromArgbLocal(argb: number): string {
  return `#${(argb & 0xffffff).toString(16).padStart(6, '0')}`
}

/**
 * Pure role-argb -> CSS-var mapping, deliberately free of any @material/material-color-utilities
 * import (that package's ESM build omits file extensions on its internal relative imports, which
 * only a bundler like Vite resolves - Node's native ESM loader, used by this project's
 * `node --test` runner, rejects it). materialTheme.ts imports the library and builds on top of
 * this file; this file stays loadable under plain Node so it can be unit tested directly.
 */
export function materialCssVarsFromArgb(roles: MaterialRoleArgbMap): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const key of MATERIAL_ROLE_KEYS) {
    vars[MATERIAL_ROLE_CSS_VARS[key]] = hexFromArgbLocal(roles[key])
  }
  return vars
}
