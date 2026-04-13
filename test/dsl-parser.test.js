import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDiagram } from '../src/model/parseDiagram.js'

test('parses nodes and edges from the custom diagram DSL', () => {
  const text = [
    'dir LR',
    '',
    'node start "开始"',
    'node review "审批"',
    'edge start -> review',
    'edge review -> done "通过"',
    'node done "完成"',
  ].join('\n')

  const graph = parseDiagram(text)

  assert.equal(graph.direction, 'LR')
  assert.deepEqual(graph.nodes, [
    { id: 'start', label: '开始' },
    { id: 'review', label: '审批' },
    { id: 'done', label: '完成' },
  ])
  assert.deepEqual(graph.edges, [
    { from: 'start', to: 'review', label: undefined },
    { from: 'review', to: 'done', label: '通过' },
  ])
})
