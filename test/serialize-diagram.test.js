import test from 'node:test'
import assert from 'node:assert/strict'

import { renameNodeLabel } from '../src/model/renameNodeLabel.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('renames a node label and serializes the graph back to DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
    ],
  }

  const updated = renameNodeLabel(graph, 'review', '人工审批')

  assert.equal(
    serializeDiagram(updated),
    [
      'dir LR',
      '',
      'node start "开始"',
      'node review "人工审批"',
      '',
      'edge start -> review "通过"',
    ].join('\n'),
  )
})

test('serializes groups, grouped nodes, and dashed edges', () => {
  const graph = {
    direction: 'TD',
    groups: [{ id: 'prompt', label: 'Prompt Assembly' }],
    nodes: [
      { id: 'A1', label: 'A1 identity system prompt', groupId: 'prompt' },
      { id: 'B', label: 'provider messages', groupId: 'prompt' },
    ],
    edges: [
      { from: 'A1', to: 'B', label: undefined, style: undefined },
      { from: 'R1', to: 'D3', label: 'tests / injected runner', style: 'dashed' },
    ],
  }

  assert.equal(
    serializeDiagram(graph),
    [
      'dir TD',
      '',
      'group prompt "Prompt Assembly"',
      '',
      'node A1 "A1 identity system prompt" in prompt',
      'node B "provider messages" in prompt',
      '',
      'edge A1 -> B',
      'edge R1 -> D3 "tests / injected runner" dashed',
    ].join('\n'),
  )
})

test('serializes optional node type attributes', () => {
  const graph = {
    direction: 'TD',
    groups: [{ id: 'prompt', label: 'Prompt Assembly' }],
    nodes: [
      { id: 'decision', label: '需要工具?', type: 'decision' },
      { id: 'grouped', label: '分组决策', groupId: 'prompt', type: 'decision' },
    ],
    edges: [],
  }

  assert.equal(
    serializeDiagram(graph),
    [
      'dir TD',
      '',
      'group prompt "Prompt Assembly"',
      '',
      'node decision "需要工具?" type=decision',
      'node grouped "分组决策" in prompt type=decision',
      '',
    ].join('\n'),
  )
})
