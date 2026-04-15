import test from 'node:test'
import assert from 'node:assert/strict'

import { toFlowEdges } from '../src/webview-app/mapping/toFlowEdges.js'
import { toNormalReadEdgePath } from '../src/webview-app/components/edges/normalReadEdgePath.js'

test('assigns stable parallel-edge metadata for same-endpoint edges', () => {
  const edges = toFlowEdges([
    { id: 'edge_1', from: 'control', to: 'stageTwo', label: 'execute' },
    { id: 'edge_2', from: 'control', to: 'stageTwo', label: 'clarify' },
    { id: 'edge_3', from: 'control', to: 'stageTwo', label: 'task_mode' },
  ])

  assert.deepEqual(
    edges.map((edge) => ({
      id: edge.id,
      parallelIndex: edge.data.parallelIndex,
      parallelCount: edge.data.parallelCount,
    })),
    [
      { id: 'edge_1', parallelIndex: -1, parallelCount: 3 },
      { id: 'edge_2', parallelIndex: 0, parallelCount: 3 },
      { id: 'edge_3', parallelIndex: 1, parallelCount: 3 },
    ],
  )
})

test('offsets curved paths when parallelCount is greater than one', () => {
  const base = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    parallelIndex: 0,
    parallelCount: 1,
  })
  const shifted = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    parallelIndex: 1,
    parallelCount: 3,
  })

  assert.notEqual(shifted.path, base.path)
})
