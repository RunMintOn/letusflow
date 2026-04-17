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
      zIndex: 2,
      position: { x: 80, y: 120 },
      data: { label: '开始', nodeType: 'default', targetPosition: 'left', sourcePosition: 'right' },
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
      zIndex: 2,
      position: { x: 10, y: 20 },
      data: { label: '开始', nodeType: 'default', targetPosition: 'left', sourcePosition: 'right' },
      style: { width: 140, height: 56 },
    },
  ])
})

test('maps persisted group layout boxes into group nodes', () => {
  const nodes = toFlowNodes(
    {
      groups: [{ id: 'prompt', label: 'Prompt Assembly' }],
      nodes: [
        { id: 'A1', label: 'A1 identity system prompt', groupId: 'prompt' },
        { id: 'B', label: 'provider messages', groupId: 'prompt' },
      ],
    },
    {
      groups: {
        prompt: { x: 76, y: 78, w: 488, h: 122 },
      },
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
  assert.deepEqual(nodes[0].position, { x: 76, y: 78 })
  assert.deepEqual(nodes[0].style, { width: 488, height: 122, pointerEvents: 'none' })
  assert.equal(nodes[0].dragHandle, '.group-node__label')
  assert.equal(nodes[0].zIndex, 0)
  assert.equal(nodes[1].zIndex, 2)
  assert.equal(nodes[1].parentId, 'group:prompt')
  assert.deepEqual(nodes[1].position, { x: 24, y: 42 })
  assert.equal(nodes[2].parentId, 'group:prompt')
  assert.deepEqual(nodes[2].position, { x: 284, y: 42 })
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
    nodeType: 'default',
    targetPosition: 'top',
    sourcePosition: 'bottom',
  })
})

test('maps decision node type into diagram node data', () => {
  const nodes = toFlowNodes(
    {
      direction: 'TD',
      groups: [],
      nodes: [{ id: 'decision', label: '需要工具?', type: 'decision' }],
    },
    { nodes: { decision: { x: 80, y: 120, w: 132, h: 86 } } },
  )

  assert.equal(nodes[0].type, 'diagramNode')
  assert.deepEqual(nodes[0].data, {
    label: '需要工具?',
    nodeType: 'decision',
    targetPosition: 'top',
    sourcePosition: 'bottom',
  })
  assert.deepEqual(nodes[0].style, { width: 132, height: 86 })
})

test('maps preset node types and color overrides into diagram node data', () => {
  const nodes = toFlowNodes(
    {
      direction: 'LR',
      groups: [],
      nodes: [
        { id: 'start', label: '开始', type: 'start', color: 'blue' },
        { id: 'end', label: '结束', type: 'end' },
      ],
    },
    {
      nodes: {
        start: { x: 80, y: 120, w: 132, h: 46 },
        end: { x: 280, y: 120, w: 132, h: 46 },
      },
    },
  )

  assert.deepEqual(nodes[0].data, {
    label: '开始',
    nodeType: 'start',
    nodeColor: 'blue',
    targetPosition: 'left',
    sourcePosition: 'right',
  })
  assert.deepEqual(nodes[1].data, {
    label: '结束',
    nodeType: 'end',
    targetPosition: 'left',
    sourcePosition: 'right',
  })
})

test('defaults diagram nodes to the default preset when type is omitted', () => {
  const nodes = toFlowNodes(
    {
      direction: 'LR',
      groups: [],
      nodes: [{ id: 'plain', label: '普通节点' }],
    },
    { nodes: { plain: { x: 80, y: 120, w: 132, h: 46 } } },
  )

  assert.equal(nodes[0].data.nodeType, 'default')
})
