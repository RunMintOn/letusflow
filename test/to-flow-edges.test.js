import test from 'node:test'
import assert from 'node:assert/strict'

import { toFlowEdges } from '../src/webview-app/mapping/toFlowEdges.js'

test('maps graph edges to stable XYFlow edges', () => {
  const edges = toFlowEdges([
    { from: 'start', to: 'review', label: '通过' },
  ])

  assert.deepEqual(edges, [
    {
      id: 'start->review#0',
      source: 'start',
      target: 'review',
      label: '通过',
      type: 'smoothstep',
    },
  ])
})
