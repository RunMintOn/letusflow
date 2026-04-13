import test from 'node:test'
import assert from 'node:assert/strict'

import { parseDiagram } from '../src/model/parseDiagram.js'

test('parses nodes and edges from the custom diagram DSL', () => {
  const text = [
    'dir LR',
    '',
    'node start "开始"',
    'node review "审批"',
    'edge start -> review',
    'edge review -> done "通过"',
    'node done "完成"',
  ].join('\n')

  const graph = parseDiagram(text)

  assert.equal(graph.direction, 'LR')
  assert.deepEqual(graph.nodes, [
    { id: 'start', label: '开始' },
    { id: 'review', label: '审批' },
    { id: 'done', label: '完成' },
  ])
  assert.deepEqual(graph.edges, [
    { from: 'start', to: 'review', label: undefined },
    { from: 'review', to: 'done', label: '通过' },
  ])
})

test('parses groups, grouped nodes, and dashed edges', () => {
  const text = [
    'dir TD',
    '',
    'group prompt "Prompt Assembly"',
    'node A1 "A1 identity system prompt" in prompt',
    'node B "provider messages" in prompt',
    'edge A1 -> B',
    'edge R1 -> D3 "tests / injected runner" dashed',
  ].join('\n')

  const graph = parseDiagram(text)

  assert.equal(graph.direction, 'TD')
  assert.deepEqual(graph.groups, [
    { id: 'prompt', label: 'Prompt Assembly' },
  ])
  assert.deepEqual(graph.nodes, [
    { id: 'A1', label: 'A1 identity system prompt', groupId: 'prompt' },
    { id: 'B', label: 'provider messages', groupId: 'prompt' },
  ])
  assert.deepEqual(graph.edges, [
    { from: 'A1', to: 'B', label: undefined },
    { from: 'R1', to: 'D3', label: 'tests / injected runner', style: 'dashed' },
  ])
})

test('parses optional node type attributes', () => {
  const graph = parseDiagram([
    'dir TD',
    '',
    'node decision "需要工具?" type=decision',
    'node grouped "分组决策" in prompt type=decision',
  ].join('\n'))

  assert.deepEqual(graph.nodes, [
    { id: 'decision', label: '需要工具?', type: 'decision' },
    { id: 'grouped', label: '分组决策', groupId: 'prompt', type: 'decision' },
  ])
})
