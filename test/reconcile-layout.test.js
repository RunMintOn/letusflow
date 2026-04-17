import test from 'node:test'
import assert from 'node:assert/strict'

import { reconcileLayout } from '../src/model/reconcileLayout.js'

test('preserves existing node, group, and edge layout entries and allocates missing ones', () => {
  const graph = {
    direction: 'LR',
    groups: [{ id: 'prompt', label: 'Prompt' }],
    nodes: [
      { id: 'start', label: '开始', groupId: 'prompt' },
      { id: 'review', label: '审批' },
    ],
    edges: [{ id: 'e_review_pass', from: 'start', to: 'review' }],
  }

  const layout = reconcileLayout(graph, {
    version: 1,
    nodes: { start: { x: 80, y: 120, w: 140, h: 56 } },
    groups: { prompt: { x: 40, y: 80, w: 420, h: 260 } },
    edges: { e_review_pass: { sourceSide: 'right', targetSide: 'left' } },
  })

  assert.deepEqual(layout.nodes.start, { x: 80, y: 120, w: 140, h: 56 })
  assert.ok(layout.nodes.review)
  assert.deepEqual(layout.groups.prompt, { x: 40, y: 80, w: 420, h: 260 })
  assert.deepEqual(layout.edges.e_review_pass, { sourceSide: 'right', targetSide: 'left' })
  assert.ok(layout.edgeLabels)
})

test('fills missing edge handle sides from auto layout while preserving user-edited ones', () => {
  const graph = {
    direction: 'TD',
    groups: [],
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { id: 'edge_1', from: 'start', to: 'review' },
      { id: 'edge_2', from: 'start', to: 'done' },
    ],
  }

  const layout = reconcileLayout(graph, {
    version: 1,
    nodes: {},
    groups: {},
    edges: {
      edge_2: { sourceSide: 'left', targetSide: 'right' },
    },
  })

  assert.deepEqual(layout.edges.edge_1, { sourceSide: 'bottom', targetSide: 'top' })
  assert.deepEqual(layout.edges.edge_2, { sourceSide: 'left', targetSide: 'right' })
})

test('drops stale node, group, and edge layout entries', () => {
  const graph = {
    direction: 'LR',
    groups: [],
    nodes: [{ id: 'start', label: '开始' }],
    edges: [],
  }

  const layout = reconcileLayout(graph, {
    version: 1,
    nodes: {
      start: { x: 80, y: 120, w: 140, h: 56 },
      stale: { x: 0, y: 0, w: 1, h: 1 },
    },
    groups: { stale_group: { x: 0, y: 0, w: 1, h: 1 } },
    edges: { stale_edge: { sourceSide: 'right', targetSide: 'left' } },
  })

  assert.deepEqual(Object.keys(layout.nodes), ['start'])
  assert.deepEqual(layout.groups, {})
  assert.deepEqual(layout.edges, {})
})
