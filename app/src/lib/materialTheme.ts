import { Hct, MaterialDynamicColors, SchemeExpressive, argbFromHex, type DynamicColor, type DynamicScheme } from '@material/material-color-utilities'
import { MATERIAL_ROLE_KEYS, materialCssVarsFromArgb, type MaterialRoleArgbMap, type MaterialRoleKey } from './materialRoles'

const dynamicColors = new MaterialDynamicColors()

const ROLE_ACCESSORS: Record<MaterialRoleKey, () => DynamicColor> = {
  primary: () => dynamicColors.primary(),
  onPrimary: () => dynamicColors.onPrimary(),
  primaryContainer: () => dynamicColors.primaryContainer(),
  onPrimaryContainer: () => dynamicColors.onPrimaryContainer(),
  secondary: () => dynamicColors.secondary(),
  onSecondary: () => dynamicColors.onSecondary(),
  secondaryContainer: () => dynamicColors.secondaryContainer(),
  onSecondaryContainer: () => dynamicColors.onSecondaryContainer(),
  tertiary: () => dynamicColors.tertiary(),
  onTertiary: () => dynamicColors.onTertiary(),
  tertiaryContainer: () => dynamicColors.tertiaryContainer(),
  onTertiaryContainer: () => dynamicColors.onTertiaryContainer(),
  surface: () => dynamicColors.surface(),
  surfaceContainerLowest: () => dynamicColors.surfaceContainerLowest(),
  surfaceContainerLow: () => dynamicColors.surfaceContainerLow(),
  surfaceContainer: () => dynamicColors.surfaceContainer(),
  surfaceContainerHigh: () => dynamicColors.surfaceContainerHigh(),
  surfaceContainerHighest: () => dynamicColors.surfaceContainerHighest(),
  onSurface: () => dynamicColors.onSurface(),
  onSurfaceVariant: () => dynamicColors.onSurfaceVariant(),
  outline: () => dynamicColors.outline(),
  outlineVariant: () => dynamicColors.outlineVariant(),
  error: () => dynamicColors.error(),
  onError: () => dynamicColors.onError(),
}

function schemeFor(sourceHex: string, isDark: boolean): DynamicScheme {
  return new SchemeExpressive(Hct.fromInt(argbFromHex(sourceHex)), isDark, 0, '2025')
}

export function computeMaterialRoleArgb(sourceHex: string, isDark: boolean): MaterialRoleArgbMap {
  const scheme = schemeFor(sourceHex, isDark)
  const roles = {} as MaterialRoleArgbMap
  for (const key of MATERIAL_ROLE_KEYS) {
    roles[key] = ROLE_ACCESSORS[key]().getArgb(scheme)
  }
  return roles
}

export function applyMaterialTheme(sourceHex: string, isDark: boolean, target: HTMLElement = document.documentElement): void {
  const cssVars = materialCssVarsFromArgb(computeMaterialRoleArgb(sourceHex, isDark))
  for (const [name, value] of Object.entries(cssVars)) {
    target.style.setProperty(name, value)
  }
}
