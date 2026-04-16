import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDiagramIr } from '../src/model/diagramIr/buildDiagramIr.js'
import { buildElkGraph } from '../src/model/layout/buildElkGraph.js'
import { runElkLayout } from '../src/model/layout/runElkLayout.js'
import { extractLayoutResult } from '../src/model/layout/extractLayoutResult.js'

test('buildElkGraph emits compound children and labeled edges', () => {
  const ir = buildDiagramIr({
    direction: 'TD',
    groups: [{ id: 'stage_1', label: 'Stage 1' }],
    nodes: [
      { id: 'router', label: 'Router', groupId: 'stage_1' },
      { id: 'task', label: 'Task' },
    ],
    edges: [{ id: 'e1', from: 'router', to: 'task', label: '复杂任务' }],
  })

  const elkGraph = buildElkGraph(ir)
  const groupNode = elkGraph.children.find((child) => child.id === 'group:stage_1')

  assert.equal(elkGraph.layoutOptions['elk.algorithm'], 'layered')
  assert.equal(elkGraph.layoutOptions['elk.hierarchyHandling'], 'INCLUDE_CHILDREN')
  assert.equal(elkGraph.layoutOptions['elk.edgeRouting'], 'ORTHOGONAL')
  assert.equal(elkGraph.layoutOptions['elk.layered.considerModelOrder.strategy'], 'NODES_AND_EDGES')
  assert.equal(elkGraph.layoutOptions['elk.layered.crossingMinimization.forceNodeModelOrder'], 'true')
  assert.ok(groupNode)
  assert.equal(groupNode.children[0].id, 'router')
  assert.equal(elkGraph.edges[0].labels[0].text, '复杂任务')
})

test('runElkLayout and extractLayoutResult produce positioned nodes', async () => {
  const ir = buildDiagramIr({
    direction: 'TD',
    groups: [{ id: 'stage_1', label: 'Stage 1' }],
    nodes: [
      { id: 'router', label: 'Router', groupId: 'stage_1', type: 'decision' },
      { id: 'task', label: 'Task' },
    ],
    edges: [{ id: 'e1', from: 'router', to: 'task', label: '复杂任务' }],
  })

  const elkGraph = buildElkGraph(ir)
  const layoutedGraph = await runElkLayout(elkGraph)
  const result = extractLayoutResult(layoutedGraph)

  assert.ok(result.nodes.router)
  assert.ok(result.nodes.task)
  assert.equal(typeof result.nodes.router.x, 'number')
  assert.equal(typeof result.nodes.task.y, 'number')
})
