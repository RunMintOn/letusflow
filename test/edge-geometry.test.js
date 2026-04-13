import test from 'node:test'
import assert from 'node:assert/strict'

import { buildEdgeGeometry } from '../src/webview/edgeGeometry.js'

test('builds a direct horizontal path for nodes on the same row', () => {
  const geometry = buildEdgeGeometry(
    { x: 80, y: 120, w: 140, h: 56 },
    { x: 320, y: 120, w: 140, h: 56 },
  )

  assert.equal(geometry.path, 'M 220 148 L 320 148')
  assert.deepEqual(geometry.label, {
    x: 270,
    y: 134,
    textAnchor: 'middle',
  })
})

test('builds a direct vertical path for nodes in the same column', () => {
  const geometry = buildEdgeGeometry(
    { x: 320, y: 120, w: 140, h: 56 },
    { x: 320, y: 260, w: 140, h: 56 },
  )

  assert.equal(geometry.path, 'M 390 176 L 390 260')
  assert.deepEqual(geometry.label, {
    x: 404,
    y: 218,
    textAnchor: 'start',
  })
})

test('serialized edge geometry function runs standalone in the webview context', () => {
  const serialized = buildEdgeGeometry.toString()
  const standalone = eval(`(${serialized})`)

  const geometry = standalone(
    { x: 80, y: 120, w: 140, h: 56 },
    { x: 320, y: 120, w: 140, h: 56 },
  )

  assert.equal(geometry.path, 'M 220 148 L 320 148')
})
