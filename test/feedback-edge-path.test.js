import test from 'node:test'
import assert from 'node:assert/strict'

import {
  toFeedbackEdgeLabelPosition,
  toFeedbackEdgePath,
} from '../src/webview-app/components/edges/feedbackEdgePath.js'

test('builds an outside lane path for vertical feedback edges', () => {
  const path = toFeedbackEdgePath({
    sourceX: 146,
    sourceY: 606,
    targetX: 186,
    targetY: 120,
    route: {
      direction: 'TD',
      laneX: 32,
      sourceOffset: 24,
      targetOffset: 24,
    },
  })

  assert.equal(path, 'M 146 606 L 146 630 L 32 630 L 32 96 L 186 96 L 186 120')
})

test('builds an outside lane path for horizontal feedback edges', () => {
  const path = toFeedbackEdgePath({
    sourceX: 606,
    sourceY: 146,
    targetX: 120,
    targetY: 186,
    route: {
      direction: 'LR',
      laneY: 32,
      sourceOffset: 24,
      targetOffset: 24,
    },
  })

  assert.equal(path, 'M 606 146 L 630 146 L 630 32 L 96 32 L 96 186 L 120 186')
})

test('places vertical feedback labels on the outside lane', () => {
  const labelPosition = toFeedbackEdgeLabelPosition({
    sourceX: 146,
    sourceY: 606,
    targetX: 186,
    targetY: 120,
    route: {
      direction: 'TD',
      laneX: 32,
      sourceOffset: 24,
      targetOffset: 24,
    },
  })

  assert.deepEqual(labelPosition, { x: 32, y: 363 })
})

test('places horizontal feedback labels on the outside lane', () => {
  const labelPosition = toFeedbackEdgeLabelPosition({
    sourceX: 606,
    sourceY: 146,
    targetX: 120,
    targetY: 186,
    route: {
      direction: 'LR',
      laneY: 32,
      sourceOffset: 24,
      targetOffset: 24,
    },
  })

  assert.deepEqual(labelPosition, { x: 363, y: 32 })
})
