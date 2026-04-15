import test from 'node:test'
import assert from 'node:assert/strict'

import { applyGroupMargins } from '../src/model/applyGroupMargins.js'

test('nudges grouped siblings toward each other without moving unrelated nodes', () => {
  const originalGap = 460 - 60
  const next = applyGroupMargins(
    {
      direction: 'LR',
      groups: [{ id: 'stage2', label: 'Stage 2' }],
      nodes: [
        { id: 'task_entry', label: '任务模式', groupId: 'stage2' },
        { id: 'planner', label: '执行规划', groupId: 'stage2' },
        { id: 'tool_exec', label: '工具执行器', groupId: 'stage2' },
        { id: 'ui_display', label: '终端界面显示' },
      ],
    },
    {
      nodes: {
        task_entry: { x: 400, y: 60, w: 132, h: 46 },
        planner: { x: 400, y: 260, w: 132, h: 46 },
        tool_exec: { x: 400, y: 460, w: 132, h: 46 },
        ui_display: { x: 720, y: 300, w: 132, h: 46 },
      },
    },
  )

  const tightenedGap = next.nodes.tool_exec.y - next.nodes.task_entry.y
  assert.ok(tightenedGap < originalGap)
  assert.equal(next.nodes.ui_display.y, 300)
})

test('returns the original layout when the graph has no groups', () => {
  const layout = {
    nodes: {
      start: { x: 40, y: 120, w: 132, h: 46 },
    },
  }

  assert.deepEqual(
    applyGroupMargins({ direction: 'LR', groups: [], nodes: [{ id: 'start', label: '开始' }] }, layout),
    layout,
  )
})

test('preserves edge label boxes when group margin adjustments run', () => {
  const next = applyGroupMargins(
    {
      direction: 'TD',
      groups: [{ id: 'stage2', label: 'Stage 2' }],
      nodes: [
        { id: 'task_entry', label: '任务模式', groupId: 'stage2' },
        { id: 'planner', label: '执行规划', groupId: 'stage2' },
      ],
    },
    {
      nodes: {
        task_entry: { x: 200, y: 120, w: 132, h: 46 },
        planner: { x: 420, y: 120, w: 132, h: 46 },
      },
      edgeLabels: {
        'task_entry->planner#进入执行': { x: 320, y: 96, w: 66, h: 24 },
      },
    },
  )

  assert.deepEqual(next.edgeLabels, {
    'task_entry->planner#进入执行': { x: 320, y: 96, w: 66, h: 24 },
  })
})
