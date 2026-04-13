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
  assert.ok(next.nodes.review.x - next.nodes.start.x >= 40)
  assert.ok(next.nodes.done.x - next.nodes.review.x >= 40)
  assert.equal(next.nodes.start.w, 132)
  assert.equal(next.nodes.start.h, 46)
})

test('auto-layout gives long-label nodes enough width', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    groups: [],
    nodes: [
      { id: 'P1', label: 'record model_call_started + write request artifact' },
    ],
    edges: [],
  })

  assert.ok(next.nodes.P1.w > 220)
})

test('auto-layout treats TD as top-to-bottom direction', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    groups: [],
    nodes: [
      { id: 'start', label: 'Start' },
      { id: 'done', label: 'Done' },
    ],
    edges: [{ from: 'start', to: 'done' }],
  })

  assert.ok(next.nodes.start.y < next.nodes.done.y)
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

test('auto-layout keeps the complex runtime graph within a readable TD footprint', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('complex-runtime.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  const boxes = Object.values(next.nodes)
  const minX = Math.min(...boxes.map((box) => box.x))
  const minY = Math.min(...boxes.map((box) => box.y))
  const maxX = Math.max(...boxes.map((box) => box.x + box.w))
  const maxY = Math.max(...boxes.map((box) => box.y + box.h))

  assert.ok(maxX - minX <= 2200)
  assert.ok(maxY - minY <= 3000)
  assert.ok(maxY > minY)
})
