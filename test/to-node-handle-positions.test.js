import test from 'node:test'
import assert from 'node:assert/strict'

import { toNodeHandlePositions } from '../src/webview-app/mapping/toNodeHandlePositions.js'

test('uses top-to-bottom handles for TD diagrams', () => {
  assert.deepEqual(toNodeHandlePositions('TD'), {
    targetPosition: 'top',
    sourcePosition: 'bottom',
  })
})

test('uses left-to-right handles for LR diagrams', () => {
  assert.deepEqual(toNodeHandlePositions('LR'), {
    targetPosition: 'left',
    sourcePosition: 'right',
  })
})
