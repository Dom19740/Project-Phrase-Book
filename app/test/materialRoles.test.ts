import { test } from 'node:test'
import assert from 'node:assert/strict'
import { materialCssVarsFromArgb, MATERIAL_ROLE_KEYS, type MaterialRoleArgbMap } from '../src/lib/materialRoles.js'

test('materialCssVarsFromArgb emits one --md-* CSS var per role, formatted as #rrggbb', () => {
  const roles = Object.fromEntries(MATERIAL_ROLE_KEYS.map((key, i) => [key, i])) as unknown as MaterialRoleArgbMap

  const vars = materialCssVarsFromArgb(roles)

  assert.equal(Object.keys(vars).length, MATERIAL_ROLE_KEYS.length)
  assert.equal(vars['--md-primary'], '#000000')
  assert.equal(vars['--md-on-primary'], '#000001')
})

test('materialCssVarsFromArgb formats a real ARGB int as lowercase #rrggbb, ignoring the alpha byte', () => {
  const roles = Object.fromEntries(MATERIAL_ROLE_KEYS.map((key) => [key, 0xff_ec1d8b])) as unknown as MaterialRoleArgbMap

  const vars = materialCssVarsFromArgb(roles)

  assert.equal(vars['--md-primary'], '#ec1d8b')
  assert.equal(vars['--md-surface-container-highest'], '#ec1d8b')
})
