import test from 'node:test'
import assert from 'node:assert/strict'

import { withNodeActions } from '../src/webview-app/actions/withNodeActions.js'

test('adds successor action to diagram nodes only', () => {
  const nodes = [
    { id: 'group:prompt', type: 'groupNode', data: { label: 'Prompt' } },
    { id: 'start', type: 'diagramNode', data: { label: '开始' } },
  ]
  const onCreateSuccessor = () => {}
  const onEditChange = () => {}
  const onEditSubmit = () => {}
  const onEditCancel = () => {}

  const next = withNodeActions(nodes, {
    onCreateSuccessor,
    editingNodeId: 'start',
    editingLabel: '修改中',
    onEditChange,
    onEditSubmit,
    onEditCancel,
  })

  assert.equal(next[0].data.onCreateSuccessor, undefined)
  assert.equal(next[1].data.onCreateSuccessor, onCreateSuccessor)
  assert.equal(next[1].data.isEditing, true)
  assert.equal(next[1].data.editingLabel, '修改中')
  assert.equal(next[1].data.onEditChange, onEditChange)
  assert.equal(next[1].data.onEditSubmit, onEditSubmit)
  assert.equal(next[1].data.onEditCancel, onEditCancel)
})
