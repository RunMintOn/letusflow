import test from 'node:test'
import assert from 'node:assert/strict'

import { canDropNodeIntoGroup, shiftGroupWithChildren } from '../src/model/groupLayout.js'
import { createGroup } from '../src/model/createGroup.js'
import { deleteGroup } from '../src/model/deleteGroup.js'
import { renameGroupLabel } from '../src/model/renameGroupLabel.js'
import { moveNodeToGroup } from '../src/model/moveNodeToGroup.js'

test('createGroup appends a new group with a stable id', () => {
  const graph = createGroup(
    { direction: 'LR', groups: [], nodes: [], edges: [] },
    { id: 'prompt', label: 'Prompt' },
  )

  assert.deepEqual(graph.groups, [{ id: 'prompt', label: 'Prompt' }])
})

test('deleteGroup ungroups member nodes', () => {
  const graph = deleteGroup({
    direction: 'LR',
    groups: [{ id: 'prompt', label: 'Prompt' }],
    nodes: [{ id: 'start', label: '开始', groupId: 'prompt' }],
    edges: [],
  }, 'prompt')

  assert.equal(graph.groups.length, 0)
  assert.equal(graph.nodes[0].groupId, undefined)
})

test('renameGroupLabel updates the target group only', () => {
  const graph = renameGroupLabel({
    direction: 'LR',
    groups: [{ id: 'prompt', label: 'Prompt' }, { id: 'other', label: 'Other' }],
    nodes: [],
    edges: [],
  }, 'prompt', 'Prompt 2')

  assert.deepEqual(graph.groups, [
    { id: 'prompt', label: 'Prompt 2' },
    { id: 'other', label: 'Other' },
  ])
})

test('moveNodeToGroup updates node membership', () => {
  const graph = moveNodeToGroup({
    direction: 'LR',
    groups: [{ id: 'prompt', label: 'Prompt' }],
    nodes: [{ id: 'start', label: '开始' }],
    edges: [],
  }, 'start', 'prompt')

  assert.equal(graph.nodes[0].groupId, 'prompt')
})

test('shiftGroupWithChildren moves the group box and member node boxes together', () => {
  const layout = shiftGroupWithChildren(
    {
      version: 1,
      nodes: {
        start: { x: 100, y: 120, w: 140, h: 56 },
        review: { x: 320, y: 120, w: 140, h: 56 },
      },
      groups: {
        prompt: { x: 80, y: 80, w: 420, h: 220 },
      },
      edges: {},
    },
    'prompt',
    { x: 20, y: 30 },
    {
      direction: 'LR',
      groups: [{ id: 'prompt', label: 'Prompt' }],
      nodes: [
        { id: 'start', label: '开始', groupId: 'prompt' },
        { id: 'review', label: '审批' },
      ],
      edges: [],
    },
  )

  assert.deepEqual(layout.groups.prompt, { x: 100, y: 110, w: 420, h: 220 })
  assert.deepEqual(layout.nodes.start, { x: 120, y: 150, w: 140, h: 56 })
  assert.deepEqual(layout.nodes.review, { x: 320, y: 120, w: 140, h: 56 })
})

test('strict drop requires the node body to land in the group content area', () => {
  const accepted = canDropNodeIntoGroup(
    { x: 160, y: 180, w: 140, h: 56 },
    { x: 120, y: 120, w: 400, h: 220 },
  )

  const rejected = canDropNodeIntoGroup(
    { x: 90, y: 180, w: 140, h: 56 },
    { x: 120, y: 120, w: 400, h: 220 },
  )

  assert.equal(accepted, true)
  assert.equal(rejected, false)
})
