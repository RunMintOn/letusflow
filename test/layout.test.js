import test from 'node:test'
import assert from 'node:assert/strict'

import { autoLayoutGraph } from '../src/model/layout.js'

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

  assert.ok(next.nodes.start.x < next.nodes.review.x)
  assert.ok(next.nodes.review.x < next.nodes.done.x)
  assert.ok(next.nodes.review.x < next.nodes.revise.x)
  assert.equal(next.nodes.start.w, 140)
  assert.equal(next.nodes.start.h, 56)
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

  assert.ok(next.nodes.start.x < next.nodes.review.x)
  assert.ok(next.nodes.review.x < next.nodes.done.x)
  assert.ok(next.nodes.review.x < next.nodes.revise.x)
  assert.notDeepEqual(
    { x: next.nodes.review.x, y: next.nodes.review.y },
    { x: next.nodes.revise.x, y: next.nodes.revise.y },
  )
})
