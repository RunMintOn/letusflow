import test from 'node:test'
import assert from 'node:assert/strict'

import { toNormalReadEdgePath } from '../src/webview-app/components/edges/normalReadEdgePath.js'

test('keeps straight left-side fan-in visually close to the native straight edge', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    targetSide: 'left',
    targetOffset: 8,
    renderMode: 'straight',
  })

  assert.equal(geometry.path, 'M 120,180L 360,208')
  assert.deepEqual(geometry.label, { x: 240, y: 194 })
})

test('keeps straight top-side fan-in visually close to the native straight edge', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 180,
    sourceY: 120,
    targetX: 200,
    targetY: 360,
    targetSide: 'top',
    targetOffset: -8,
    renderMode: 'straight',
  })

  assert.equal(geometry.path, 'M 180,120L 192,360')
  assert.deepEqual(geometry.label, { x: 186, y: 240 })
})

test('keeps zero-offset straight edges identical to the old native baseline', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    targetSide: 'left',
    targetOffset: 0,
    renderMode: 'straight',
  })

  assert.equal(geometry.path, 'M 120,180L 360,200')
  assert.deepEqual(geometry.label, { x: 240, y: 190 })
})

test('keeps default-mode paths curved while shifting the target anchor', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    targetSide: 'left',
    targetOffset: 8,
    renderMode: 'default',
  })

  assert.match(geometry.path, /^M120,180 C/)
  assert.match(geometry.path, /360,208$/)
  assert.deepEqual(geometry.label, { x: 240, y: 194 })
})
