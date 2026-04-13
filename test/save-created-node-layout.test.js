import test from 'node:test'
import assert from 'node:assert/strict'

import { createLayoutForNode } from '../src/model/layout.js'

test('creates a default layout entry for a newly added node', () => {
  const next = createLayoutForNode(
    {
      nodes: {
        start: { x: 80, y: 120, w: 140, h: 56 },
        review: { x: 320, y: 120, w: 140, h: 56 },
      },
    },
    'done',
  )

  assert.deepEqual(next.nodes.done, { x: 540, y: 120, w: 140, h: 56 })
})
