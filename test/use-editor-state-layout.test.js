import test from 'node:test'
import assert from 'node:assert/strict'

import { toEditorLayout } from '../src/webview-app/state/toEditorLayout.js'
import { toFlowCollections } from '../src/webview-app/state/toFlowCollections.js'

test('editor layout responds immediately to local spacing changes', () => {
  const documentModel = {
    graph: {
      direction: 'LR',
      groups: [],
      nodes: [
        { id: 'start', label: 'Start' },
        { id: 'done', label: 'Done' },
      ],
      edges: [{ from: 'start', to: 'done' }],
    },
    layout: {
      nodes: {
        start: { x: 1, y: 2, w: 132, h: 46 },
        done: { x: 10, y: 2, w: 132, h: 46 },
      },
    },
  }
  const compact = toEditorLayout(documentModel, 30, true)
  const loose = toEditorLayout(documentModel, 150, true)

  assert.ok(loose.nodes.done.x - loose.nodes.start.x > compact.nodes.done.x - compact.nodes.start.x)
})

test('editor layout falls back to document layout when spacing is missing', () => {
  const documentModel = {
    graph: { direction: 'LR', groups: [], nodes: [], edges: [] },
    layout: { nodes: { start: { x: 1, y: 2, w: 132, h: 46 } } },
  }

  assert.equal(toEditorLayout(documentModel, undefined), documentModel.layout)
})

test('editor layout keeps document layout during normal renders even when spacing exists', () => {
  const documentModel = {
    graph: {
      direction: 'LR',
      groups: [],
      nodes: [
        { id: 'start', label: 'Start' },
        { id: 'done', label: 'Done' },
      ],
      edges: [{ from: 'start', to: 'done' }],
    },
    layout: {
      nodes: {
        start: { x: 101, y: 12, w: 132, h: 46 },
        done: { x: 144, y: 12, w: 132, h: 46 },
      },
    },
  }

  assert.equal(toEditorLayout(documentModel, 150, false), documentModel.layout)
})

test('toFlowCollections prefers route-c view model when enabled', () => {
  const documentModel = {
    graph: {
      direction: 'TD',
      groups: [],
      nodes: [{ id: 'router', label: 'Router' }],
      edges: [],
    },
    routeC: {
      enabled: true,
      viewModel: {
        nodes: [
          {
            id: 'router',
            position: { x: 100, y: 200 },
            data: { label: 'Router' },
            style: { width: 132, height: 46 },
          },
        ],
        groups: [],
        edges: [],
      },
    },
  }

  const { flowNodes, flowEdges } = toFlowCollections(documentModel, { nodes: {} })

  assert.equal(flowNodes[0].position.x, 100)
  assert.deepEqual(flowEdges, [])
})

test('toFlowCollections uses route-c as the default render path when a view model is present', () => {
  const documentModel = {
    graph: {
      direction: 'TD',
      groups: [],
      nodes: [{ id: 'router', label: 'Router' }],
      edges: [],
    },
    routeC: {
      enabled: false,
      viewModel: {
        nodes: [
          {
            id: 'router',
            position: { x: 310, y: 420 },
            data: { label: 'Router' },
            style: { width: 132, height: 46 },
          },
        ],
        groups: [],
        edges: [],
      },
    },
  }

  const { flowNodes } = toFlowCollections(documentModel, { nodes: {} })

  assert.equal(flowNodes[0].position.x, 310)
  assert.equal(flowNodes[0].position.y, 420)
})
