import test from 'node:test'
import assert from 'node:assert/strict'

import {
  autoLayoutGraph,
  toDagreEdgePriority,
  toDagreSpacing,
} from '../src/model/layout.js'
import { getNodeDimensions } from '../src/model/nodeDimensions.js'

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

test('auto-layout gives decision nodes a diamond-friendly footprint', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    groups: [],
    nodes: [
      { id: 'decision', label: '需要工具?', type: 'decision' },
    ],
    edges: [],
  })

  assert.equal(next.nodes.decision.w, 132)
  assert.equal(next.nodes.decision.h, 86)
})

test('shared node dimensions stay aligned with dagre layout sizing', () => {
  assert.deepEqual(
    getNodeDimensions({ id: 'start', label: '开始' }),
    { w: 132, h: 46 },
  )
  assert.deepEqual(
    getNodeDimensions({ id: 'decision', label: '需要工具?', type: 'decision' }),
    { w: 132, h: 86 },
  )
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

test('auto-layout keeps the accorda overview graph within a readable TD footprint', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('例图与对比/accorda-full-overview.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  const boxes = Object.values(next.nodes)
  const minX = Math.min(...boxes.map((box) => box.x))
  const minY = Math.min(...boxes.map((box) => box.y))
  const maxX = Math.max(...boxes.map((box) => box.x + box.w))
  const maxY = Math.max(...boxes.map((box) => box.y + box.h))

  assert.ok(maxX - minX <= 900)
  assert.ok(maxY - minY <= 1400)
  assert.ok(maxY > minY)
})

test('auto-layout keeps labeled edges in the accorda overview graph with stable edge label boxes', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('例图与对比/accorda-full-overview.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  assert.ok(Object.keys(next.edgeLabels).length >= 8)
  assert.ok(next.edgeLabels['user_cmd->event_store#1. 存入事件日志'])
  assert.ok(next.edgeLabels['router->task_entry#复杂任务/读写文件'])
})

test('auto-layout keys edgeLabels by runtime edge id', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { id: 'edge_1', from: 'start', to: 'review', label: '通过' },
    ],
  })

  assert.ok(next.edgeLabels.edge_1)
  assert.equal(next.edgeLabels['start->review#通过'], undefined)
})

test('dagre edge priority favors edges that follow declaration order', () => {
  const nodeOrder = new Map([
    ['start', 0],
    ['work', 1],
    ['retry', 2],
  ])

  assert.deepEqual(
    toDagreEdgePriority({ from: 'start', to: 'work' }, nodeOrder),
    { weight: 3, minlen: 1 },
  )
})

test('dagre edge priority weakens edges that point back in declaration order', () => {
  const nodeOrder = new Map([
    ['start', 0],
    ['work', 1],
    ['retry', 2],
  ])

  assert.deepEqual(
    toDagreEdgePriority({ from: 'retry', to: 'work' }, nodeOrder),
    { weight: 1, minlen: 1 },
  )
})

test('dagre edge priority stays neutral when an edge references unknown nodes', () => {
  const nodeOrder = new Map([['start', 0]])

  assert.deepEqual(
    toDagreEdgePriority({ from: 'start', to: 'missing' }, nodeOrder),
    { weight: 1, minlen: 1 },
  )
})

test('auto-layout keeps default spacing aligned with Mermaid-like density', () => {
  assert.deepEqual(toDagreSpacing(), { ranksep: 64, nodesep: 34 })
})

test('auto-layout scales dagre spacing from a percentage option', () => {
  assert.deepEqual(toDagreSpacing({ spacing: 150 }), { ranksep: 96, nodesep: 51 })
})

test('auto-layout applies spacing options to node placement', () => {
  const graph = {
    direction: 'LR',
    groups: [],
    nodes: [
      { id: 'start', label: 'Start' },
      { id: 'done', label: 'Done' },
    ],
    edges: [{ from: 'start', to: 'done' }],
  }
  const compact = autoLayoutGraph(graph, { spacing: 30 })
  const loose = autoLayoutGraph(graph, { spacing: 150 })

  assert.ok(loose.nodes.done.x - loose.nodes.start.x > compact.nodes.done.x - compact.nodes.start.x)
})

test('auto-layout clamps invalid spacing options', () => {
  assert.deepEqual(toDagreSpacing({ spacing: 10 }), { ranksep: 19, nodesep: 10 })
  assert.deepEqual(toDagreSpacing({ spacing: 220 }), { ranksep: 96, nodesep: 51 })
  assert.deepEqual(toDagreSpacing({ spacing: 'wide' }), { ranksep: 64, nodesep: 34 })
})

test('auto-layout reorders LR same-rank siblings into a more readable main-flow order', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'revise', label: '补充信息' },
      { id: 'done', label: '完成' },
      { id: 'archive', label: '归档' },
    ],
    edges: [
      { from: 'start', to: 'review' },
      { from: 'review', to: 'done' },
      { from: 'review', to: 'revise' },
      { from: 'done', to: 'archive' },
      { from: 'revise', to: 'review' },
    ],
  })

  assert.ok(next.nodes.review.x < next.nodes.done.x)
  assert.ok(next.nodes.done.y < next.nodes.revise.y)
})

test('auto-layout reorders TD same-rank siblings without breaking vertical layering', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'task', label: '任务模式' },
      { id: 'reply', label: '直接响应' },
      { id: 'clarify', label: '追问澄清' },
    ],
    edges: [
      { from: 'start', to: 'task' },
      { from: 'start', to: 'reply' },
      { from: 'start', to: 'clarify' },
    ],
  })

  assert.equal(next.nodes.task.y, next.nodes.reply.y)
  assert.ok(next.nodes.task.x < next.nodes.reply.x)
  assert.ok(next.nodes.reply.x < next.nodes.clarify.x)
})

test('auto-layout keeps grouped stage-2 nodes visually tighter without changing main layering', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    groups: [{ id: 'stage2', label: 'Stage 2' }],
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'task_entry', label: '任务模式', groupId: 'stage2' },
      { id: 'planner', label: '执行规划', groupId: 'stage2' },
      { id: 'tool_exec', label: '工具执行器', groupId: 'stage2' },
    ],
    edges: [
      { from: 'start', to: 'task_entry' },
      { from: 'task_entry', to: 'planner' },
      { from: 'planner', to: 'tool_exec' },
    ],
  })

  assert.ok(next.nodes.start.y < next.nodes.task_entry.y)
  assert.ok(next.nodes.task_entry.x <= next.nodes.planner.x)
})

test('auto-layout returns edge label boxes for labeled edges without exposing dummy nodes', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
    ],
  })

  assert.deepEqual(Object.keys(next.nodes), ['start', 'review'])
  assert.deepEqual(Object.keys(next.edgeLabels), ['start->review#通过'])
  assert.ok(next.edgeLabels['start->review#通过'].w >= 52)
})

test('auto-layout keeps the accorda overview stage-2 group compact after post-layout', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('例图与对比/accorda-full-overview.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  const stage2 = ['task_entry', 'planner', 'tool_exec'].map((id) => next.nodes[id]).filter(Boolean)
  const stage2Xs = stage2.map((box) => box.x)
  const stage2Ys = stage2.map((box) => box.y)

  assert.ok(Math.max(...stage2Xs) - Math.min(...stage2Xs) <= 220)
  assert.ok(Math.max(...stage2Ys) - Math.min(...stage2Ys) <= 180)
})
