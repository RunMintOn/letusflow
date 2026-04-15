import test from 'node:test'
import assert from 'node:assert/strict'

import { derivePrimaryFlow } from '../src/model/derivePrimaryFlow.js'

test('prioritizes forward main-flow nodes over back-edge targets', () => {
  const scores = derivePrimaryFlow({
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

  assert.ok(scores.review > scores.revise)
  assert.ok(scores.done >= scores.revise)
})

test('keeps source-order tie breaking stable when nodes have similar topology', () => {
  const scores = derivePrimaryFlow({
    direction: 'TD',
    nodes: [
      { id: 'B', label: 'B' },
      { id: 'A', label: 'A' },
      { id: 'C', label: 'C' },
    ],
    edges: [],
  })

  assert.deepEqual(Object.keys(scores), ['B', 'A', 'C'])
  assert.equal(scores.B, scores.A)
  assert.equal(scores.A, scores.C)
})
