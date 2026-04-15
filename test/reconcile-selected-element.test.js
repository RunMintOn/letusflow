import test from 'node:test'
import assert from 'node:assert/strict'

import { reconcileSelectedElement } from '../src/webview-app/state/reconcileSelectedElement.js'

test('clears a selected node when incremental sync removes it', () => {
  const next = reconcileSelectedElement(
    { type: 'node', id: 'review' },
    [{ id: 'start' }],
    [],
  )

  assert.equal(next, null)
})

test('refreshes selected edge identity from the synced edge by edgeId', () => {
  const next = reconcileSelectedElement(
    { type: 'edge', id: 'edge_2', edgeId: 'edge_2', edgeRef: { from: 'start', to: 'done', label: 'old' } },
    [],
    [
      {
        id: 'edge_2',
        data: { edgeId: 'edge_2', edgeRef: { from: 'start', to: 'done', label: 'ok' } },
      },
    ],
  )

  assert.deepEqual(next, {
    type: 'edge',
    id: 'edge_2',
    edgeId: 'edge_2',
    edgeRef: { from: 'start', to: 'done', label: 'ok' },
  })
})
