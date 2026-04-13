import test from 'node:test'
import assert from 'node:assert/strict'

import { renameNodeLabel } from '../src/model/renameNodeLabel.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('renames a node label and serializes the graph back to DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
    ],
  }

  const updated = renameNodeLabel(graph, 'review', '人工审批')

  assert.equal(
    serializeDiagram(updated),
    [
      'dir LR',
      '',
      'node start "开始"',
      'node review "人工审批"',
      '',
      'edge start -> review "通过"',
    ].join('\n'),
  )
})
