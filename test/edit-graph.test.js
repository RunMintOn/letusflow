import test from 'node:test'
import assert from 'node:assert/strict'

import { createSuccessorNode } from '../src/model/createSuccessorNode.js'
import { deleteEdge } from '../src/model/deleteEdge.js'
import { deleteNode } from '../src/model/deleteNode.js'
import { renameEdgeLabel } from '../src/model/renameEdgeLabel.js'

test('deletes a node and its connected edges', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'review' },
      { from: 'review', to: 'done', label: '通过' },
      { from: 'start', to: 'done', label: '跳过' },
    ],
  }

  const next = deleteNode(graph, 'review')

  assert.deepEqual(next.nodes, [
    { id: 'start', label: '开始' },
    { id: 'done', label: '完成' },
  ])
  assert.deepEqual(next.edges, [
    { from: 'start', to: 'done', label: '跳过' },
  ])
})

test('deletes a matching edge without touching other edges', () => {
  const graph = {
    direction: 'LR',
    nodes: [],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
      { from: 'start', to: 'review', label: '驳回' },
    ],
  }

  const next = deleteEdge(graph, { from: 'start', to: 'review', label: '通过' })

  assert.deepEqual(next.edges, [
    { from: 'start', to: 'review', label: '驳回' },
  ])
})

test('renames a matching edge label', () => {
  const graph = {
    direction: 'LR',
    nodes: [],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
      { from: 'start', to: 'review', label: '驳回' },
    ],
  }

  const next = renameEdgeLabel(graph, { from: 'start', to: 'review', label: '通过' }, '同意')

  assert.deepEqual(next.edges, [
    { from: 'start', to: 'review', label: '同意' },
    { from: 'start', to: 'review', label: '驳回' },
  ])
})

test('creates a successor node and edge from an existing node', () => {
  const graph = {
    direction: 'LR',
    nodes: [{ id: 'start', label: '开始' }],
    edges: [],
  }

  const next = createSuccessorNode(graph, 'start', { id: 'node_1', label: '新节点' })

  assert.deepEqual(next.nodes, [
    { id: 'start', label: '开始' },
    { id: 'node_1', label: '新节点' },
  ])
  assert.deepEqual(next.edges, [
    { from: 'start', to: 'node_1', label: undefined },
  ])
})
