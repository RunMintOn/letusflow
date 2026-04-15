import test from 'node:test'
import assert from 'node:assert/strict'

import { createEdgeId, withEdgeIds } from '../src/model/withEdgeIds.js'

test('adds stable runtime ids to parsed edges in source order', () => {
  const graph = withEdgeIds({
    direction: 'LR',
    nodes: [],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
      { from: 'start', to: 'review', label: '澄清' },
    ],
  })

  assert.deepEqual(
    graph.edges.map((edge) => edge.id),
    ['edge_1', 'edge_2'],
  )
})

test('preserves existing runtime ids when normalizing a graph again', () => {
  const graph = withEdgeIds({
    direction: 'LR',
    nodes: [],
    edges: [
      { id: 'edge_7', from: 'start', to: 'review', label: '通过' },
    ],
  })

  assert.equal(graph.edges[0].id, 'edge_7')
})

test('creates the next available edge id from an existing graph', () => {
  const edgeId = createEdgeId([
    { id: 'edge_1' },
    { id: 'edge_2' },
    { id: 'edge_8' },
  ])

  assert.equal(edgeId, 'edge_9')
})
