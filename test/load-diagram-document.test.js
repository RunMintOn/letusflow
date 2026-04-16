import test from 'node:test'
import assert from 'node:assert/strict'

import { loadDiagramDocument, loadDiagramDocumentFromSource } from '../src/workspace/loadDiagramDocument.js'

test('loads diagram source with persisted sidecar layout', async () => {
  const files = new Map([
    [
      '/workspace/example.flow',
      [
        'dir LR',
        'node start "开始"',
        'node review "审批"',
        'edge start -> review id=e_review',
      ].join('\n'),
    ],
    [
      '/workspace/example.flow.layout.json',
      JSON.stringify({
        version: 1,
        nodes: {
          start: { x: 80, y: 120, w: 140, h: 56 },
        },
        groups: {},
        edges: {
          e_review: { sourceSide: 'right', targetSide: 'left' },
        },
      }),
    ],
  ])

  const fsLike = {
    async readFile(path) {
      if (!files.has(path)) {
        throw new Error(`Missing file: ${path}`)
      }
      return files.get(path)
    },
  }

  const doc = await loadDiagramDocument(fsLike, '/workspace/example.flow')

  assert.equal(doc.sourcePath, '/workspace/example.flow')
  assert.equal(doc.layoutPath, '/workspace/example.flow.layout.json')
  assert.equal(doc.graph.nodes.length, 2)
  assert.equal(doc.layout.nodes.start.x, 80)
  assert.equal(doc.layout.nodes.start.y, 120)
  assert.equal(doc.layout.edges.e_review.sourceSide, 'right')
  assert.ok(doc.layout.nodes.review)
})

test('loads a diagram document directly from source text and upgrades edge ids', async () => {
  const model = await loadDiagramDocumentFromSource(
    '/workspace/example.flow',
    'dir LR\nnode start "开始"\nnode review "审批"\nedge start -> review\n',
  )

  assert.equal(model.sourcePath, '/workspace/example.flow')
  assert.equal(model.layoutPath, '/workspace/example.flow.layout.json')
  assert.equal(model.graph.nodes.length, 2)
  assert.match(model.sourceText, /edge start -> review id=edge_1/)
  assert.ok(model.layout.nodes.start)
  assert.ok(model.layout.edges.edge_1)
})

test('normalizes parsed edges with runtime ids before reconcile', async () => {
  const model = await loadDiagramDocumentFromSource(
    '/workspace/example.flow',
    [
      'dir LR',
      'node start "开始"',
      'node review "审批"',
      'edge start -> review "通过"',
    ].join('\n'),
  )

  assert.equal(model.graph.edges[0].id, 'edge_1')
  assert.equal(model.layout.edges.edge_1.sourceSide, 'right')
})
