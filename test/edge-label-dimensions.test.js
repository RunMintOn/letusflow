import test from 'node:test'
import assert from 'node:assert/strict'

import { getEdgeLabelDimensions } from '../src/model/edgeLabelDimensions.js'

test('gives short labels a minimum readable box', () => {
  assert.deepEqual(getEdgeLabelDimensions('执行'), { w: 52, h: 24 })
})

test('grows width for longer edge labels but keeps a stable height', () => {
  const short = getEdgeLabelDimensions('执行')
  const long = getEdgeLabelDimensions('反馈观察结果 (Loop)')

  assert.equal(short.h, 24)
  assert.equal(long.h, 24)
  assert.ok(long.w > short.w)
})
