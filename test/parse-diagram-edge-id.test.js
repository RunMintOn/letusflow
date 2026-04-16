import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDiagram } from '../src/model/parseDiagram.js'

test('parses edge id after label', () => {
  const graph = parseDiagram('edge start -> review "通过" id=e_review_pass')

  assert.deepEqual(graph.edges, [
    { from: 'start', to: 'review', label: '通过', id: 'e_review_pass' },
  ])
})

test('parses edge id after style', () => {
  const graph = parseDiagram('edge review -> done "否" dashed id=e_review_done')

  assert.deepEqual(graph.edges, [
    { from: 'review', to: 'done', label: '否', style: 'dashed', id: 'e_review_done' },
  ])
})
