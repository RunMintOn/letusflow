import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRoutingResult } from '../src/model/routing/buildRoutingResult.js'
import { toFlowViewModel } from '../src/model/view-model/toFlowViewModel.js'

test('buildRoutingResult extracts edge sections and label boxes', () => {
  const routing = buildRoutingResult({
    edges: [
      {
        id: 'e1',
        sections: [
          {
            startPoint: { x: 10, y: 20 },
            bendPoints: [{ x: 10, y: 80 }],
            endPoint: { x: 120, y: 80 },
          },
        ],
        labels: [{ text: '复杂任务', x: 40, y: 50, width: 80, height: 20 }],
      },
    ],
  })

  assert.deepEqual(routing.sectionsByEdgeId.e1[0].bendPoints, [{ x: 10, y: 80 }])
  assert.deepEqual(routing.labelBoxesByEdgeId.e1, { x: 40, y: 50, w: 80, h: 20 })
})

test('toFlowViewModel maps layout and routing results into XYFlow-friendly collections', () => {
  const viewModel = toFlowViewModel({
    graph: {
      nodes: [
        { id: 'router', label: 'Router', type: 'decision' },
        { id: 'task', label: 'Task', groupId: 'stage_1' },
      ],
      edges: [
        { id: 'e1', from: 'router', to: 'task', label: '复杂任务' },
      ],
    },
    layoutResult: {
      nodes: {
        router: { x: 10, y: 20, w: 132, h: 86 },
        task: { x: 200, y: 220, w: 132, h: 46 },
      },
      groups: {
        stage_1: { x: 160, y: 180, w: 240, h: 140, label: 'Stage 1' },
      },
    },
    routingResult: {
      sectionsByEdgeId: {
        e1: [
          {
            startPoint: { x: 76, y: 106 },
            bendPoints: [{ x: 76, y: 180 }],
            endPoint: { x: 266, y: 220 },
          },
        ],
      },
      labelBoxesByEdgeId: {
        e1: { x: 120, y: 150, w: 80, h: 20 },
      },
    },
  })

  assert.equal(viewModel.nodes[0].id, 'router')
  assert.equal(viewModel.nodes[0].position.x, 10)
  assert.equal(viewModel.groups[0].id, 'group:stage_1')
  assert.deepEqual(viewModel.edges[0].data.sections[0].bendPoints, [{ x: 76, y: 180 }])
  assert.deepEqual(viewModel.edges[0].data.labelLayout, { x: 120, y: 150, w: 80, h: 20 })
})
