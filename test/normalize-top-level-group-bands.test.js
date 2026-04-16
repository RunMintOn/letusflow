import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeTopLevelGroupBands } from '../src/model/layout/normalizeTopLevelGroupBands.js'

test('normalizeTopLevelGroupBands reorders TD groups by declaration order and shifts child nodes with them', () => {
  const adjusted = normalizeTopLevelGroupBands(
    {
      direction: 'TD',
      groups: [
        { id: 'input', label: 'Input' },
        { id: 'stage1', label: 'Stage 1' },
        { id: 'output', label: 'Output' },
      ],
      nodes: [
        { id: 'input_a', label: 'Input A', groupId: 'input' },
        { id: 'stage1_a', label: 'Stage A', groupId: 'stage1' },
        { id: 'output_a', label: 'Output A', groupId: 'output' },
      ],
    },
    {
      nodes: {
        input_a: { x: 100, y: 260, w: 120, h: 40 },
        stage1_a: { x: 120, y: 20, w: 120, h: 40 },
        output_a: { x: 140, y: 140, w: 120, h: 40 },
      },
      groups: {
        input: { x: 80, y: 240, w: 200, h: 80, label: 'Input' },
        stage1: { x: 100, y: 0, w: 220, h: 100, label: 'Stage 1' },
        output: { x: 120, y: 120, w: 210, h: 90, label: 'Output' },
      },
      edgeLabels: {},
      sections: {},
    },
  )

  assert.ok(adjusted.groups.input.y < adjusted.groups.stage1.y)
  assert.ok(adjusted.groups.stage1.y < adjusted.groups.output.y)
  assert.equal(adjusted.nodes.input_a.y, adjusted.groups.input.y + 20)
  assert.equal(adjusted.nodes.stage1_a.y, adjusted.groups.stage1.y + 20)
  assert.equal(adjusted.nodes.output_a.y, adjusted.groups.output.y + 20)
})
