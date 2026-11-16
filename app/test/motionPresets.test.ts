import { test } from 'node:test'
import assert from 'node:assert/strict'
import { springFromDampingRatio } from '../src/lib/motionPresets.js'

test('springFromDampingRatio converts an M3 damping ratio to Framer Motion damping via critical damping (2*sqrt(stiffness*mass))', () => {
  const spatialDefault = springFromDampingRatio(380, 0.8)
  assert.equal(spatialDefault.stiffness, 380)
  assert.ok(Math.abs(spatialDefault.damping - 31.19) < 0.01, `expected ~31.19, got ${spatialDefault.damping}`)

  const spatialFast = springFromDampingRatio(800, 0.6)
  assert.ok(Math.abs(spatialFast.damping - 33.94) < 0.01, `expected ~33.94, got ${spatialFast.damping}`)
})

test('a damping ratio of 1 (critically damped, no bounce) yields damping equal to critical damping', () => {
  const effectsDefault = springFromDampingRatio(1600, 1)
  const criticalDamping = 2 * Math.sqrt(1600)
  assert.equal(effectsDefault.damping, criticalDamping)
})
