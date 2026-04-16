import test from 'node:test'
import assert from 'node:assert/strict'

import { createEdge } from '../src/model/createEdge.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('creates a new edge with a runtime id and serializes it back to the DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = createEdge(graph, { id: 'edge_1', from: 'start', to: 'review' })

  assert.equal(next.edges[0].id, 'edge_1')
  assert.match(serializeDiagram(next), /edge start -> review id=edge_1/)
})
