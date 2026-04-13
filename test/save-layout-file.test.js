import test from 'node:test'
import assert from 'node:assert/strict'

import { saveLayoutFile } from '../src/workspace/saveLayoutFile.js'

test('writes updated layout sidecar as formatted json', async () => {
  const writes = []
  const fsLike = {
    async writeFile(path, content) {
      writes.push({ path, content })
    },
  }

  await saveLayoutFile(fsLike, '/workspace/example.flow.layout.json', {
    nodes: {
      start: { x: 200, y: 120, w: 140, h: 56 },
    },
  })

  assert.equal(writes[0]?.path, '/workspace/example.flow.layout.json')
  assert.match(writes[0]?.content ?? '', /"start"/)
  assert.match(writes[0]?.content ?? '', /\n  "nodes"/)
})
