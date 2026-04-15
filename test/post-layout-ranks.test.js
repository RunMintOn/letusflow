import test from 'node:test'
import assert from 'node:assert/strict'

import { postLayoutRanks } from '../src/model/postLayoutRanks.js'

test('reorders LR same-rank nodes by primary-flow score before source order', () => {
  const next = postLayoutRanks(
    {
      direction: 'LR',
      nodes: [
        { id: 'start', label: '开始' },
        { id: 'D2', label: 'Decision 2' },
        { id: 'D1', label: 'Decision 1' },
        { id: 'D3', label: 'Decision 3' },
      ],
    },
    {
      nodes: {
        start: { x: 40, y: 120, w: 132, h: 46 },
        D2: { x: 280, y: 320, w: 132, h: 46 },
        D1: { x: 282, y: 120, w: 132, h: 46 },
        D3: { x: 279, y: 220, w: 132, h: 46 },
      },
    },
    { ranksep: 64, nodesep: 34 },
    { start: 5, D2: 3, D1: 4, D3: 2 },
  )

  assert.ok(next.nodes.D1.y < next.nodes.D2.y)
  assert.ok(next.nodes.D2.y < next.nodes.D3.y)
  assert.equal(next.nodes.D1.x, next.nodes.D2.x)
})

test('reorders TD same-rank nodes across the x axis only', () => {
  const next = postLayoutRanks(
    {
      direction: 'TD',
      nodes: [
        { id: 'start', label: '开始' },
        { id: 'B', label: 'B' },
        { id: 'A', label: 'A' },
        { id: 'C', label: 'C' },
      ],
    },
    {
      nodes: {
        start: { x: 120, y: 40, w: 132, h: 46 },
        B: { x: 260, y: 260, w: 132, h: 46 },
        A: { x: 80, y: 262, w: 132, h: 46 },
        C: { x: 420, y: 259, w: 132, h: 46 },
      },
    },
    { ranksep: 64, nodesep: 34 },
    { start: 5, B: 3, A: 4, C: 2 },
  )

  assert.ok(next.nodes.A.x < next.nodes.B.x)
  assert.ok(next.nodes.B.x < next.nodes.C.x)
  assert.equal(next.nodes.A.y, next.nodes.B.y)
})

test('uses a rank tolerance so near-identical primary-axis values stay in one rank', () => {
  const next = postLayoutRanks(
    {
      direction: 'LR',
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
    },
    {
      nodes: {
        A: { x: 400, y: 100, w: 132, h: 46 },
        B: { x: 404, y: 220, w: 132, h: 46 },
      },
    },
    { ranksep: 64, nodesep: 34 },
    { A: 1, B: 0 },
  )

  assert.ok(Math.abs(next.nodes.A.x - next.nodes.B.x) <= 4)
})
