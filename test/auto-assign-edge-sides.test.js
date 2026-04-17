import test from 'node:test'
import assert from 'node:assert/strict'

import { autoAssignEdgeSides } from '../src/model/autoAssignEdgeSides.js'

test('assigns horizontal handles when the target is farther left or right', () => {
  const graph = {
    edges: [
      { id: 'edge_right', from: 'start', to: 'review' },
      { id: 'edge_left', from: 'review', to: 'start' },
    ],
  }
  const nodeLayouts = {
    start: { x: 0, y: 0, w: 140, h: 56 },
    review: { x: 240, y: 10, w: 140, h: 56 },
  }

  const next = autoAssignEdgeSides(graph, nodeLayouts)

  assert.deepEqual(next.edge_right, { sourceSide: 'right', targetSide: 'left' })
  assert.deepEqual(next.edge_left, { sourceSide: 'left', targetSide: 'right' })
})

test('assigns vertical handles when the target is farther above or below', () => {
  const graph = {
    edges: [
      { id: 'edge_down', from: 'start', to: 'approve' },
      { id: 'edge_up', from: 'approve', to: 'start' },
    ],
  }
  const nodeLayouts = {
    start: { x: 120, y: 0, w: 140, h: 56 },
    approve: { x: 140, y: 220, w: 140, h: 56 },
  }

  const next = autoAssignEdgeSides(graph, nodeLayouts)

  assert.deepEqual(next.edge_down, { sourceSide: 'bottom', targetSide: 'top' })
  assert.deepEqual(next.edge_up, { sourceSide: 'top', targetSide: 'bottom' })
})
