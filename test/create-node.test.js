import test from 'node:test'
import assert from 'node:assert/strict'

import { createNode } from '../src/model/createNode.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('creates a new node and serializes it back to the DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [{ id: 'start', label: '开始' }],
    edges: [],
  }

  const next = createNode(graph, { id: 'review', label: '审批' })

  assert.match(serializeDiagram(next), /node review "审批"/)
})
