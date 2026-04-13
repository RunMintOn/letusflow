import test from 'node:test'
import assert from 'node:assert/strict'

import { generateNodeId } from '../src/model/generateNodeId.js'

test('generates a stable incrementing node id from the current graph', () => {
  const nextId = generateNodeId(
    [
      { id: 'node', label: 'A' },
      { id: 'node-2', label: 'B' },
    ],
    'node',
  )

  assert.equal(nextId, 'node-3')
})
