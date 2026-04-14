import test from 'node:test'
import assert from 'node:assert/strict'

import { placeSuccessorNode } from '../src/model/placeSuccessorNode.js'

test('places an LR successor to the right of the parent using spacing-derived gap', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'LR',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'New successor' },
      ],
    },
    {
      nodes: {
        parent: { x: 100, y: 200, w: 132, h: 46 },
      },
    },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.deepEqual(placement, {
    x: 306,
    y: 200,
    w: 132,
    h: 46,
  })
})

test('places a TD successor below the parent using spacing-derived gap', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'TD',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'New successor' },
      ],
    },
    {
      nodes: {
        parent: { x: 100, y: 200, w: 132, h: 46 },
      },
    },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.deepEqual(placement, {
    x: 100,
    y: 320,
    w: 132,
    h: 46,
  })
})

test('steps along the cross-axis until an LR successor slot is free', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'LR',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'occupied', label: 'Occupied' },
        { id: 'child', label: 'New successor' },
      ],
    },
    {
      nodes: {
        parent: { x: 100, y: 200, w: 132, h: 46 },
        occupied: { x: 306, y: 200, w: 132, h: 46 },
      },
    },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.deepEqual(placement, {
    x: 306,
    y: 292,
    w: 132,
    h: 46,
  })
})

test('returns null when the parent has no stored layout box', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'LR',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'New successor' },
      ],
    },
    { nodes: {} },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.equal(placement, null)
})
