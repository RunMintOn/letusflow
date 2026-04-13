import test from 'node:test'
import assert from 'node:assert/strict'

import { createEdge } from '../src/model/createEdge.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('creates a new edge and serializes it back to the DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = createEdge(graph, { from: 'start', to: 'review' })

  assert.match(serializeDiagram(next), /edge start -> review/)
})
