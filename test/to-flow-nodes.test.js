import test from 'node:test'
import assert from 'node:assert/strict'

import { toFlowNodes } from '../src/webview-app/mapping/toFlowNodes.js'

test('maps graph nodes and layout entries to XYFlow nodes', () => {
  const nodes = toFlowNodes(
    [{ id: 'start', label: '开始' }],
    { nodes: { start: { x: 80, y: 120, w: 140, h: 56 } } },
  )

  assert.deepEqual(nodes, [
    {
      id: 'start',
      type: 'diagramNode',
      position: { x: 80, y: 120 },
      data: { label: '开始' },
      style: { width: 140, height: 56 },
    },
  ])
})

test('maps graph nodes with default layout when a layout entry is missing', () => {
  const nodes = toFlowNodes(
    [{ id: 'start', label: '开始' }],
    { nodes: {} },
  )

  assert.deepEqual(nodes, [
    {
      id: 'start',
      type: 'diagramNode',
      position: { x: 10, y: 20 },
      data: { label: '开始' },
      style: { width: 140, height: 56 },
    },
  ])
})
