import test from 'node:test'
import assert from 'node:assert/strict'

import { toObsidianDotGridPattern } from '../src/webview-app/components/obsidianDotGridMath.js'

test('scales dot spacing with zoom while keeping dot radius fixed', () => {
  const pattern = toObsidianDotGridPattern({ x: 15, y: -7, zoom: 2 })

  assert.deepEqual(pattern, {
    gap: 40,
    offsetX: 15,
    offsetY: 33,
    radius: 0.5,
  })
})

test('falls back to base spacing when zoom is invalid', () => {
  const pattern = toObsidianDotGridPattern({ x: 0, y: 0, zoom: Number.NaN })

  assert.deepEqual(pattern, {
    gap: 20,
    offsetX: 0,
    offsetY: 0,
    radius: 0.5,
  })
})
