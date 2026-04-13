import test from 'node:test'
import assert from 'node:assert/strict'

import { autoLayoutGraph, preserveLayout } from '../src/model/layout.js'

test('preserves layout for existing node ids and auto-places new nodes', () => {
  const previous = {
    nodes: {
      start: { x: 10, y: 20, w: 140, h: 56 },
      removed: { x: 30, y: 40, w: 140, h: 56 },
    },
  }

  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = preserveLayout(previous, graph)

  assert.deepEqual(next.nodes.start, { x: 10, y: 20, w: 140, h: 56 })
  assert.deepEqual(next.nodes.review, { x: 230, y: 20, w: 140, h: 56 })
  assert.equal(next.nodes.removed, undefined)
})

test('auto-layout places nodes by dependency depth for LR graphs', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'revise', label: '补充信息' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'review' },
      { from: 'review', to: 'done' },
      { from: 'review', to: 'revise' },
    ],
  })

  assert.deepEqual(next.nodes.start, { x: 80, y: 120, w: 140, h: 56 })
  assert.deepEqual(next.nodes.review, { x: 320, y: 120, w: 140, h: 56 })
  assert.deepEqual(next.nodes.done, { x: 560, y: 120, w: 140, h: 56 })
  assert.deepEqual(next.nodes.revise, { x: 560, y: 280, w: 140, h: 56 })
})

test('auto-layout keeps back-edge cycles from collapsing into the root level', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'revise', label: '补充信息' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'review' },
      { from: 'review', to: 'done' },
      { from: 'review', to: 'revise' },
      { from: 'revise', to: 'review' },
    ],
  })

  assert.equal(next.nodes.review.x, 320)
  assert.equal(next.nodes.done.x, 560)
  assert.equal(next.nodes.revise.x, 560)
})
