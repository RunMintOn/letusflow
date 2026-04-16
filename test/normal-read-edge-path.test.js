import test from 'node:test'
import assert from 'node:assert/strict'

import { toNormalReadEdgePath } from '../src/webview-app/components/edges/normalReadEdgePath.js'

test('builds a plain straight edge geometry from source to target', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
  })

  assert.match(geometry.path, /^M/)
  assert.match(geometry.path, /C/)
  assert.deepEqual(geometry.label, { x: 240, y: 178 })
})

test('does not require route metadata for vertical edges', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 180,
    sourceY: 120,
    targetX: 200,
    targetY: 360,
  })

  assert.match(geometry.path, /^M/)
  assert.match(geometry.path, /C/)
  assert.deepEqual(geometry.label, { x: 190, y: 240 })
})

test('clips a vertical incoming edge to the visible decision boundary', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 212,
    sourceY: 120,
    targetX: 212,
    targetY: 303,
    targetNode: {
      nodeType: 'decision',
      x: 146,
      y: 303,
      w: 132,
      h: 86,
    },
  })

  assert.match(geometry.path, /^M212,120/)
  assert.match(geometry.path, /212,301/)
  assert.match(geometry.path, /C/)
  assert.deepEqual(geometry.label, { x: 212, y: 211 })
})

test('clips a horizontal outgoing edge to the visible decision boundary', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 278,
    sourceY: 346,
    targetX: 400,
    targetY: 346,
    sourceNode: {
      nodeType: 'decision',
      x: 146,
      y: 303,
      w: 132,
      h: 86,
    },
  })

  assert.match(geometry.path, /^M257,346/)
  assert.match(geometry.path, /400,346/)
  assert.match(geometry.path, /C/)
  assert.deepEqual(geometry.label, { x: 329, y: 334 })
})

test('nudges labels upward for nearly horizontal edges to reduce node overlap', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 260,
    targetX: 420,
    targetY: 268,
  })

  assert.equal(geometry.label.x, 270)
  assert.ok(geometry.label.y < 264)
})

test('returns a path from precomputed route sections when present', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 10,
    sourceY: 20,
    targetX: 100,
    targetY: 120,
    sections: [
      {
        startPoint: { x: 10, y: 20 },
        bendPoints: [{ x: 10, y: 70 }, { x: 100, y: 70 }],
        endPoint: { x: 100, y: 120 },
      },
    ],
    labelLayout: { x: 50, y: 60, w: 80, h: 20 },
  })

  assert.equal(geometry.path, 'M10,20 L10,70 L100,70 L100,120')
  assert.deepEqual(geometry.label, { x: 90, y: 70 })
})
