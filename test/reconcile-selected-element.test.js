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

test('refreshes edgeRef from the synced edge when the selected edge still exists', () => {
  const next = reconcileSelectedElement(
    { type: 'edge', id: 'start->done#ok', edgeRef: { from: 'start', to: 'done', label: 'old' } },
    [],
    [
      {
        id: 'start->done#ok',
        data: { edgeRef: { from: 'start', to: 'done', label: 'ok' } },
      },
    ],
  )

  assert.deepEqual(next, {
    type: 'edge',
    id: 'start->done#ok',
    edgeRef: { from: 'start', to: 'done', label: 'ok' },
  })
})
