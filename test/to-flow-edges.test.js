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
      style: { stroke: '#6f6f78', strokeWidth: 2 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: { fill: '#55555f', fontSize: 12, fontWeight: 500 },
      data: {
        edgeId: 'start->review#通过',
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
  assert.deepEqual(edges[0].style, { stroke: '#6f6f78', strokeWidth: 2, strokeDasharray: '4 4' })
})

test('maps dotted and dashdot graph edges to styled XYFlow edges', () => {
  const edges = toFlowEdges([
    { from: 'review', to: 'retry', label: '重试', style: 'dotted' },
    { from: 'review', to: 'fallback', label: '降级', style: 'dashdot' },
  ])

  assert.deepEqual(edges[0].style, {
    stroke: '#6f6f78',
    strokeWidth: 2,
    strokeDasharray: '1 4',
  })
  assert.deepEqual(edges[1].style, {
    stroke: '#6f6f78',
    strokeWidth: 2,
    strokeDasharray: '4 2 1 2',
  })
})

test('maps all graph edges to one readable XYFlow edge type', () => {
  const edges = toFlowEdges([
    { from: 'start', to: 'review', label: '通过' },
    { from: 'retry', to: 'review', label: '重试' },
  ])

  assert.deepEqual(
    edges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      data: edge.data,
    })),
    [
      {
        id: 'start->review#通过',
        type: 'readEdge',
        data: {
          edgeId: 'start->review#通过',
          edgeRef: { from: 'start', to: 'review', label: '通过' },
        },
      },
      {
        id: 'retry->review#重试',
        type: 'readEdge',
        data: {
          edgeId: 'retry->review#重试',
          edgeRef: { from: 'retry', to: 'review', label: '重试' },
        },
      },
    ],
  )
})

test('does not create feedback routes or target offsets for back edges', () => {
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

  assert.equal(edges[0].type, 'readEdge')
  assert.deepEqual(edges[0].data, {
    edgeId: 'append_result->build_ctx#',
    edgeRef: {
      from: 'append_result',
      to: 'build_ctx',
      label: undefined,
    },
  })
  assert.equal(edges[0].className, undefined)
})

test('maps endpoint node metadata needed for decision boundary clipping', () => {
  const edges = toFlowEdges(
    [{ from: 'task_mode', to: 'executor', label: '执行' }],
    [
      { id: 'task_mode', label: 'task_mode', type: 'default' },
      { id: 'executor', label: 'Executor LLM', type: 'decision' },
    ],
    {
      nodes: {
        task_mode: { x: 80, y: 120, w: 132, h: 46 },
        executor: { x: 146, y: 303, w: 132, h: 86 },
      },
    },
  )

  assert.deepEqual(edges[0].data, {
    edgeId: 'task_mode->executor#执行',
    edgeRef: {
      from: 'task_mode',
      to: 'executor',
      label: '执行',
    },
    sourceNode: {
      nodeType: 'default',
      x: 80,
      y: 120,
      w: 132,
      h: 46,
    },
    targetNode: {
      nodeType: 'decision',
      x: 146,
      y: 303,
      w: 132,
      h: 86,
    },
  })
})

test('passes edge label layout geometry into edge data when layout provides it', () => {
  const edges = toFlowEdges(
    [{ from: 'start', to: 'review', label: '通过' }],
    [{ id: 'start', label: '开始' }, { id: 'review', label: '审批' }],
    {
      nodes: {
        start: { x: 80, y: 120, w: 132, h: 46 },
        review: { x: 280, y: 120, w: 132, h: 46 },
      },
      edgeLabels: {
        'start->review#通过': { x: 180, y: 96, w: 52, h: 24 },
      },
    },
  )

  assert.deepEqual(edges[0].data.labelLayout, { x: 180, y: 96, w: 52, h: 24 })
})

test('binds labelLayout by runtime edge id instead of from-to-label key', () => {
  const edges = toFlowEdges(
    [{ id: 'edge_2', from: 'start', to: 'review', label: '通过' }],
    [{ id: 'start', label: '开始' }, { id: 'review', label: '审批' }],
    {
      nodes: {
        start: { x: 80, y: 120, w: 132, h: 46 },
        review: { x: 280, y: 120, w: 132, h: 46 },
      },
      edgeLabels: {
        edge_2: { x: 180, y: 96, w: 52, h: 24 },
      },
    },
  )

  assert.equal(edges[0].id, 'edge_2')
  assert.deepEqual(edges[0].data.labelLayout, { x: 180, y: 96, w: 52, h: 24 })
})
