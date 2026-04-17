import test from 'node:test'
import assert from 'node:assert/strict'

import { fromNodeDragMessage } from '../src/webview-app/bridge/fromNodeDragMessage.js'

test('builds a saveNodeLayout message from the node position by default', () => {
  const message = fromNodeDragMessage({
    id: 'review',
    position: { x: 120, y: 180 },
    style: { width: 160, height: 60 },
  })

  assert.deepEqual(message, {
    type: 'saveNodeLayout',
    nodeId: 'review',
    layout: {
      x: 120,
      y: 180,
      w: 160,
      h: 60,
    },
  })
})

test('supports saving an explicit absolute layout position for parented nodes', () => {
  const message = fromNodeDragMessage(
    {
      id: 'review',
      position: { x: 24, y: 42 },
      style: { width: 160, height: 60 },
    },
    { x: 100, y: 120 },
  )

  assert.deepEqual(message, {
    type: 'saveNodeLayout',
    nodeId: 'review',
    layout: {
      x: 100,
      y: 120,
      w: 160,
      h: 60,
    },
  })
})
