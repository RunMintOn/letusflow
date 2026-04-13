import test from 'node:test'
import assert from 'node:assert/strict'

import { withNodeActions } from '../src/webview-app/actions/withNodeActions.js'

test('adds successor action to diagram nodes only', () => {
  const nodes = [
    { id: 'group:prompt', type: 'groupNode', data: { label: 'Prompt' } },
    { id: 'start', type: 'diagramNode', data: { label: '开始' } },
  ]
  const onCreateSuccessor = () => {}

  const next = withNodeActions(nodes, { onCreateSuccessor })

  assert.equal(next[0].data.onCreateSuccessor, undefined)
  assert.equal(next[1].data.onCreateSuccessor, onCreateSuccessor)
})
