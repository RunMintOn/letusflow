import test from 'node:test'
import assert from 'node:assert/strict'

import { toFlowEdges } from '../src/webview-app/mapping/toFlowEdges.js'

test('maps graph edges to stable readable XYFlow edges', () => {
  const edges = toFlowEdges([{ from: 'start', to: 'review', label: '通过' }])

  assert.deepEqual(edges, [
    {
      id: 'start->review#通过',
      source: 'start',
      target: 'review',
      label: '通过',
      type: 'readEdge',
      markerEnd: { type: 'arrowclosed', color: '#6f6f78' },
      style: { stroke: '#6f6f78', strokeWidth: 1.2 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: { fill: '#55555f', fontSize: 11, fontWeight: 400 },
      data: {
        edgeRef: { from: 'start', to: 'review', label: '通过' },
        readRoute: {
          renderMode: 'straight',
          targetOffset: 0,
          targetSide: 'left',
        },
      },
    },
  ])
})

test('maps graph edges to optional bezier XYFlow edges', () => {
  const edges = toFlowEdges(
    [{ from: 'start', to: 'review', label: '通过' }],
    undefined,
    'LR',
    'default',
  )

  assert.equal(edges[0].type, 'readEdge')
  assert.deepEqual(edges[0].data.readRoute, {
    renderMode: 'default',
    targetOffset: 0,
    targetSide: 'left',
  })
})

test('keeps edge ids stable when another edge is inserted before it', () => {
  const targetEdge = { from: 'review', to: 'done', label: '通过' }
  const before = toFlowEdges([targetEdge])
  const after = toFlowEdges([
    { from: 'start', to: 'review', label: undefined },
    targetEdge,
  ])

  assert.equal(before[0].id, after[1].id)
})

test('maps dashed graph edges to dashed XYFlow edges', () => {
  const edges = toFlowEdges([
    { from: 'R1', to: 'D3', label: 'tests / injected runner', style: 'dashed' },
  ])

  assert.equal(edges[0].animated, false)
  assert.deepEqual(edges[0].style, { stroke: '#6f6f78', strokeWidth: 1.2, strokeDasharray: '4 4' })
})

test('fans in converging edges with symmetric offsets on the same target side', () => {
  const edges = toFlowEdges(
    [
      { from: 'sourceC', to: 'target', label: 'C' },
      { from: 'sourceA', to: 'target', label: 'A' },
      { from: 'sourceB', to: 'target', label: 'B' },
    ],
    {
      nodes: {
        sourceA: { x: 80, y: 100, w: 120, h: 44 },
        sourceB: { x: 80, y: 200, w: 120, h: 44 },
        sourceC: { x: 80, y: 320, w: 120, h: 44 },
        target: { x: 360, y: 200, w: 140, h: 44 },
      },
    },
    'LR',
  )

  assert.deepEqual(
    edges.map((edge) => ({
      id: edge.id,
      targetSide: edge.data.readRoute.targetSide,
      targetOffset: edge.data.readRoute.targetOffset,
    })),
    [
      { id: 'sourceC->target#C', targetSide: 'left', targetOffset: 8 },
      { id: 'sourceA->target#A', targetSide: 'left', targetOffset: -8 },
      { id: 'sourceB->target#B', targetSide: 'left', targetOffset: 0 },
    ],
  )
})

test('fans in vertical converging edges by x-order for top target handles', () => {
  const edges = toFlowEdges(
    [
      { from: 'sourceRight', to: 'target', label: 'R' },
      { from: 'sourceLeft', to: 'target', label: 'L' },
    ],
    {
      nodes: {
        sourceLeft: { x: 80, y: 80, w: 120, h: 44 },
        sourceRight: { x: 280, y: 80, w: 120, h: 44 },
        target: { x: 180, y: 260, w: 140, h: 44 },
      },
    },
    'TD',
  )

  assert.deepEqual(
    edges.map((edge) => ({
      id: edge.id,
      targetSide: edge.data.readRoute.targetSide,
      targetOffset: edge.data.readRoute.targetOffset,
    })),
    [
      { id: 'sourceRight->target#R', targetSide: 'top', targetOffset: 4 },
      { id: 'sourceLeft->target#L', targetSide: 'top', targetOffset: -4 },
    ],
  )
})

test('maps upstream edges to feedback smoothstep edges', () => {
  const edges = toFlowEdges(
    [{ from: 'append_result', to: 'build_ctx', label: undefined }],
    {
      nodes: {
        build_ctx: { x: 120, y: 120, w: 132, h: 46 },
        append_result: { x: 80, y: 560, w: 132, h: 46 },
      },
    },
    'TD',
  )

  assert.equal(edges[0].type, 'feedbackEdge')
  assert.equal(edges[0].className, 'diagram-flow-edge--feedback')
  assert.deepEqual(edges[0].data.feedbackRoute, {
    direction: 'TD',
    laneX: 32,
    sourceOffset: 24,
    targetOffset: 24,
  })
  assert.deepEqual(edges[0].style, { stroke: '#6f6f78', strokeWidth: 1.2, opacity: 0.72 })
})

test('keeps feedback edges custom when optional bezier mode is selected', () => {
  const edges = toFlowEdges(
    [{ from: 'append_result', to: 'build_ctx', label: undefined }],
    {
      nodes: {
        build_ctx: { x: 120, y: 120, w: 132, h: 46 },
        append_result: { x: 80, y: 560, w: 132, h: 46 },
      },
    },
    'TD',
    'default',
  )

  assert.equal(edges[0].type, 'feedbackEdge')
})
