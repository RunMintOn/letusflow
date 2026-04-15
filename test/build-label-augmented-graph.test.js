import test from 'node:test'
import assert from 'node:assert/strict'

import { buildLabelAugmentedGraph } from '../src/model/buildLabelAugmentedGraph.js'

test('splits only labeled edges into dummy label nodes and segment edges', () => {
  const next = buildLabelAugmentedGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
      { from: 'review', to: 'done' },
    ],
  })

  assert.ok(next.graph.nodes.some((node) => node.id.startsWith('__edge_label__:start->review#通过')))
  assert.equal(next.graph.edges.length, 3)
  assert.deepEqual(Object.keys(next.edgeLabelMap), ['start->review#通过'])
})

test('keeps unlabeled edges untouched in the augmented graph', () => {
  const next = buildLabelAugmentedGraph({
    direction: 'TD',
    nodes: [
      { id: 'task', label: '任务模式' },
      { id: 'planner', label: '执行规划' },
    ],
    edges: [
      { from: 'task', to: 'planner' },
    ],
  })

  assert.equal(next.graph.nodes.length, 2)
  assert.equal(next.graph.edges.length, 1)
  assert.deepEqual(next.edgeLabelMap, {})
})
