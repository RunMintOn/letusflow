import test from 'node:test'
import assert from 'node:assert/strict'

import { withLiveEdgeNodeGeometry } from '../src/webview-app/mapping/withLiveEdgeNodeGeometry.js'

test('hydrates edge decision geometry from the current rendered nodes', () => {
  const nodes = [
    {
      id: 'decision',
      type: 'diagramNode',
      position: { x: 320, y: 180 },
      data: { nodeType: 'decision', label: '判断' },
      style: { width: 132, height: 86 },
    },
    {
      id: 'next',
      type: 'diagramNode',
      position: { x: 560, y: 200 },
      data: { nodeType: 'default', label: '继续' },
      style: { width: 140, height: 56 },
    },
  ]

  const edges = [
    {
      id: 'edge_1',
      source: 'decision',
      target: 'next',
      data: {
        edgeId: 'edge_1',
        edgeRef: { from: 'decision', to: 'next' },
        sourceNode: { nodeType: 'decision', x: 10, y: 20, w: 1, h: 1 },
      },
    },
  ]

  const nextEdges = withLiveEdgeNodeGeometry(edges, nodes)

  assert.notStrictEqual(nextEdges, edges)
  assert.deepEqual(nextEdges[0].data.sourceNode, {
    nodeType: 'decision',
    x: 320,
    y: 180,
    w: 132,
    h: 86,
  })
  assert.deepEqual(nextEdges[0].data.targetNode, {
    nodeType: 'default',
    x: 560,
    y: 200,
    w: 140,
    h: 56,
  })
  assert.deepEqual(nextEdges[0].data.edgeRef, { from: 'decision', to: 'next' })
})
