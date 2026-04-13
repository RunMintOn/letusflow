import test from 'node:test'
import assert from 'node:assert/strict'

import { applyMovedNodes } from '../src/model/layout.js'

test('applies XYFlow node positions back into the layout sidecar', () => {
  const next = applyMovedNodes(
    { nodes: { start: { x: 80, y: 120, w: 140, h: 56 } } },
    [{ id: 'start', position: { x: 220, y: 180 } }],
  )

  assert.deepEqual(next.nodes.start, { x: 220, y: 180, w: 140, h: 56 })
})
