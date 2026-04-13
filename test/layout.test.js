import test from 'node:test'
import assert from 'node:assert/strict'

import { preserveLayout } from '../src/model/layout.js'

test('preserves layout for existing node ids and auto-places new nodes', () => {
  const previous = {
    nodes: {
      start: { x: 10, y: 20, w: 140, h: 56 },
      removed: { x: 30, y: 40, w: 140, h: 56 },
    },
  }

  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = preserveLayout(previous, graph)

  assert.deepEqual(next.nodes.start, { x: 10, y: 20, w: 140, h: 56 })
  assert.deepEqual(next.nodes.review, { x: 230, y: 20, w: 140, h: 56 })
  assert.equal(next.nodes.removed, undefined)
})
