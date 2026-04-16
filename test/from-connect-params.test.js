import test from 'node:test'
import assert from 'node:assert/strict'

import { fromConnectParams } from '../src/webview-app/mapping/fromConnectParams.js'

test('maps XYFlow connect params back to graph edge shape', () => {
  assert.deepEqual(
    fromConnectParams({
      source: 'start',
      sourceHandle: 'bottom-source',
      target: 'review',
      targetHandle: 'top-target',
    }),
    { from: 'start', to: 'review', label: undefined, sourceSide: 'bottom', targetSide: 'top' },
  )
})
