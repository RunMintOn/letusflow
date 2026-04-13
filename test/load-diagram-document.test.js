import test from 'node:test'
import assert from 'node:assert/strict'

import { loadDiagramDocument } from '../src/workspace/loadDiagramDocument.js'

test('loads diagram source and layout into one document model', async () => {
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
          start: { x: 80, y: 120, w: 140, h: 56 },
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
  assert.deepEqual(doc.layout.nodes.start, { x: 80, y: 120, w: 140, h: 56 })
  assert.deepEqual(doc.layout.nodes.review, { x: 300, y: 120, w: 140, h: 56 })
})
