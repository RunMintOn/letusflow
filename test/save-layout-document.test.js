import test from 'node:test'
import assert from 'node:assert/strict'

import { saveLayoutDocument } from '../src/workspace/saveLayoutDocument.js'

test('writes normalized layout sidecar JSON with a trailing newline', async () => {
  const writes = []
  const fsLike = {
    async writeFile(path, content) {
      writes.push([path, content])
    },
  }

  await saveLayoutDocument(fsLike, '/workspace/example.flow.layout.json', {
    version: 1,
    nodes: { start: { x: 80, y: 120, w: 140, h: 56 } },
    groups: {},
    edges: {},
  })

  assert.deepEqual(writes, [
    [
      '/workspace/example.flow.layout.json',
      '{\n  "version": 1,\n  "nodes": {\n    "start": {\n      "x": 80,\n      "y": 120,\n      "w": 140,\n      "h": 56\n    }\n  },\n  "groups": {},\n  "edges": {}\n}\n',
    ],
  ])
})
