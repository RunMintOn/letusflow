import test from 'node:test'
import assert from 'node:assert/strict'

import { applyLiveGroupDrag } from '../src/webview-app/actions/applyLiveGroupDrag.js'

test('moves group members in lockstep while the group is being dragged', () => {
  const nodes = [
    {
      id: 'group:prompt',
      type: 'groupNode',
      position: { x: 40, y: 60 },
      data: { groupId: 'prompt', memberNodeIds: ['start', 'review'] },
    },
    { id: 'start', type: 'diagramNode', position: { x: 80, y: 120 }, data: {} },
    { id: 'review', type: 'diagramNode', position: { x: 240, y: 120 }, data: {} },
    { id: 'done', type: 'diagramNode', position: { x: 420, y: 120 }, data: {} },
  ]

  const next = applyLiveGroupDrag(nodes, {
    id: 'group:prompt',
    type: 'groupNode',
    position: { x: 70, y: 90 },
    data: { groupId: 'prompt', memberNodeIds: ['start', 'review'] },
  })

  assert.deepEqual(next[0].position, { x: 70, y: 90 })
  assert.deepEqual(next[1].position, { x: 110, y: 150 })
  assert.deepEqual(next[2].position, { x: 270, y: 150 })
  assert.deepEqual(next[3].position, { x: 420, y: 120 })
})
