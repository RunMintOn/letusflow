import test from 'node:test'
import assert from 'node:assert/strict'

import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('serializes edge ids back to flow', () => {
  const source = serializeDiagram({
    direction: 'LR',
    groups: [],
    nodes: [],
    edges: [{ id: 'e_review_pass', from: 'start', to: 'review', label: '通过' }],
  })

  assert.match(source, /edge start -> review "通过" id=e_review_pass/)
})
