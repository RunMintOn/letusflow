import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDiagram } from '../src/model/parseDiagram.js'
import { buildDiagramIr } from '../src/model/diagramIr/buildDiagramIr.js'

test('buildDiagramIr preserves direction, groups, nodes, and edge semantics', () => {
  const ir = buildDiagramIr({
    direction: 'TD',
    groups: [{ id: 'stage_1', label: 'Stage 1' }],
    nodes: [
      { id: 'router', label: 'Router', type: 'decision', groupId: 'stage_1' },
      { id: 'task', label: 'Task' },
    ],
    edges: [{ id: 'e1', from: 'router', to: 'task', label: '复杂任务' }],
  })

  assert.equal(ir.direction, 'TD')
  assert.deepEqual(ir.groups, [
    {
      id: 'stage_1',
      label: 'Stage 1',
      parentGroupId: null,
      childNodeIds: ['router'],
    },
  ])
  assert.deepEqual(ir.nodes, [
    {
      id: 'router',
      label: 'Router',
      type: 'decision',
      groupId: 'stage_1',
      style: { color: null },
    },
    {
      id: 'task',
      label: 'Task',
      type: 'default',
      groupId: null,
      style: { color: null },
    },
  ])
  assert.deepEqual(ir.edges, [
    {
      id: 'e1',
      from: 'router',
      to: 'task',
      label: '复杂任务',
      style: { pattern: 'solid' },
      semantic: { isCrossGroup: true },
    },
  ])
})

test('buildDiagramIr keeps parser output separate from geometry concerns', () => {
  const graph = parseDiagram([
    'dir TD',
    'group stage_1 "Stage 1"',
    'node router "Router" in stage_1 type=decision color=blue',
    'node reply "Reply"',
    'edge router -> reply "直接响应" dashed',
  ].join('\n'))

  const ir = buildDiagramIr(graph)

  assert.equal(graph.nodes[0].id, ir.nodes[0].id)
  assert.equal('x' in ir.nodes[0], false)
  assert.deepEqual(ir.nodes[0], {
    id: 'router',
    label: 'Router',
    type: 'decision',
    groupId: 'stage_1',
    style: { color: 'blue' },
  })
  assert.deepEqual(ir.edges[0], {
    id: 'router->reply#直接响应',
    from: 'router',
    to: 'reply',
    label: '直接响应',
    style: { pattern: 'dashed' },
    semantic: { isCrossGroup: true },
  })
})
