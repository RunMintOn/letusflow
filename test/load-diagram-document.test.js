import test from 'node:test'
import assert from 'node:assert/strict'

import { loadDiagramDocument, loadDiagramDocumentFromSource } from '../src/workspace/loadDiagramDocument.js'

test('loads diagram source and derives layout from graph instead of old sidecar positions', async () => {
  const files = new Map([
    [
      '/workspace/example.flow',
      [
        'dir LR',
        'node start "开始"',
        'node review "审批"',
        'edge start -> review',
      ].join('\n'),
    ],
    [
      '/workspace/example.flow.layout.json',
      JSON.stringify({
        nodes: {
          start: { x: 999, y: 999, w: 140, h: 56 },
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
  assert.equal('layoutPath' in doc, false)
  assert.equal(doc.graph.nodes.length, 2)
  assert.notEqual(doc.layout.nodes.start.x, 999)
  assert.notEqual(doc.layout.nodes.start.y, 999)
  assert.equal(doc.layout.nodes.start.w, 132)
  assert.equal(doc.layout.nodes.start.h, 46)
  assert.ok(doc.layout.nodes.start.x < doc.layout.nodes.review.x)
})

test('loads a diagram document directly from source text', async () => {
  const model = await loadDiagramDocumentFromSource(
    '/workspace/example.flow',
    'dir LR\nnode start "开始"\n',
  )

  assert.equal(model.sourcePath, '/workspace/example.flow')
  assert.equal(model.sourceText, 'dir LR\nnode start "开始"\n')
  assert.equal(model.graph.nodes.length, 1)
  assert.ok(model.layout.nodes.start)
})

test('normalizes parsed edges with runtime ids before layout', async () => {
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
})
