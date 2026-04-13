import test from 'node:test'
import assert from 'node:assert/strict'

import { deleteSelectedElement } from '../src/webview-app/actions/deleteSelectedElement.js'

test('sends deleteNode for a selected node', () => {
  const messages = []

  deleteSelectedElement({
    selectedElement: { type: 'node', id: 'review' },
    postToHost: (message) => messages.push(message),
  })

  assert.deepEqual(messages, [{ type: 'deleteNode', nodeId: 'review' }])
})

test('sends deleteEdge for a selected edge', () => {
  const messages = []
  const edgeRef = { from: 'review', to: 'done', label: '通过' }

  deleteSelectedElement({
    selectedElement: { type: 'edge', edgeRef },
    postToHost: (message) => messages.push(message),
  })

  assert.deepEqual(messages, [{ type: 'deleteEdge', edge: edgeRef }])
})

test('ignores delete when nothing is selected', () => {
  const messages = []

  deleteSelectedElement({
    selectedElement: null,
    postToHost: (message) => messages.push(message),
  })

  assert.deepEqual(messages, [])
})
