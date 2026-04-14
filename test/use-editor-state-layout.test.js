import test from 'node:test'
import assert from 'node:assert/strict'

import { toEditorLayout } from '../src/webview-app/state/toEditorLayout.js'

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
