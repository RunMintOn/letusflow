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
      type: 'straight',
      markerEnd: { type: 'arrowclosed', color: '#6f6f78' },
      style: { stroke: '#6f6f78', strokeWidth: 1.2 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: { fill: '#55555f', fontSize: 11, fontWeight: 400 },
      data: {
        edgeRef: { from: 'start', to: 'review', label: '通过' },
      },
    },
  ])
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

  assert.equal(edges[0].type, 'smoothstep')
  assert.equal(edges[0].className, 'diagram-flow-edge--feedback')
  assert.deepEqual(edges[0].pathOptions, { borderRadius: 12, offset: 48 })
  assert.deepEqual(edges[0].style, { stroke: '#6f6f78', strokeWidth: 1.2, opacity: 0.72 })
})
