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
      className: 'diagram-flow-node',
      position: { x: 80, y: 120 },
      data: { label: '开始', targetPosition: 'left', sourcePosition: 'right' },
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
      className: 'diagram-flow-node',
      position: { x: 10, y: 20 },
      data: { label: '开始', targetPosition: 'left', sourcePosition: 'right' },
      style: { width: 140, height: 56 },
    },
  ])
})

test('adds non-draggable group nodes around grouped graph nodes', () => {
  const nodes = toFlowNodes(
    {
      groups: [{ id: 'prompt', label: 'Prompt Assembly' }],
      nodes: [
        { id: 'A1', label: 'A1 identity system prompt', groupId: 'prompt' },
        { id: 'B', label: 'provider messages', groupId: 'prompt' },
      ],
    },
    {
      nodes: {
        A1: { x: 100, y: 120, w: 180, h: 56 },
        B: { x: 360, y: 120, w: 180, h: 56 },
      },
    },
  )

  assert.equal(nodes[0].id, 'group:prompt')
  assert.equal(nodes[0].type, 'groupNode')
  assert.equal(nodes[0].className, 'diagram-flow-group')
  assert.equal(nodes[0].data.label, 'Prompt Assembly')
  assert.equal(nodes[0].draggable, false)
  assert.deepEqual(nodes[0].position, { x: 76, y: 78 })
  assert.deepEqual(nodes[0].style, { width: 488, height: 122 })
})

test('diagram nodes carry read-mode classes for Mermaid-like styling', () => {
  const nodes = toFlowNodes(
    {
      groups: [{ id: 'prompt', label: 'Prompt Assembly' }],
      nodes: [{ id: 'A1', label: 'A1 identity system prompt', groupId: 'prompt' }],
    },
    { nodes: { A1: { x: 80, y: 120, w: 180, h: 46 } } },
  )

  assert.equal(nodes[0].className, 'diagram-flow-group')
  assert.equal(nodes[1].className, 'diagram-flow-node')
})

test('diagram nodes use vertical handles for TD graphs', () => {
  const nodes = toFlowNodes(
    {
      direction: 'TD',
      groups: [],
      nodes: [{ id: 'start', label: 'User Input' }],
    },
    { nodes: { start: { x: 80, y: 120, w: 132, h: 46 } } },
  )

  assert.deepEqual(nodes[0].data, {
    label: 'User Input',
    targetPosition: 'top',
    sourcePosition: 'bottom',
  })
})
