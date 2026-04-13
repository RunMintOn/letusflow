import test from 'node:test'
import assert from 'node:assert/strict'

import { resetFlowLayout } from '../src/webview-app/actions/resetFlowLayout.js'

test('resets local flow state before asking the host to auto-layout', () => {
  const calls = []
  const flowNodes = [{ id: 'start', position: { x: 10, y: 20 } }]
  const flowEdges = [{ id: 'start->done#' }]

  resetFlowLayout({
    flowNodes,
    flowEdges,
    setNodes: (nextNodes) => calls.push(['setNodes', nextNodes]),
    setEdges: (nextEdges) => calls.push(['setEdges', nextEdges]),
    postToHost: (message) => calls.push(['postToHost', message]),
  })

  assert.deepEqual(calls, [
    ['setNodes', flowNodes],
    ['setEdges', flowEdges],
    ['postToHost', { type: 'autoLayout' }],
  ])
})
