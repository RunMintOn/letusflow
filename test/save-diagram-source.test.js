import test from 'node:test'
import assert from 'node:assert/strict'

import { saveDiagramSource } from '../src/workspace/saveDiagramSource.js'

test('writes the updated diagram DSL back to the source file', async () => {
  const writes = []
  const fsLike = {
    async writeFile(path, content) {
      writes.push({ path, content })
    },
  }

  await saveDiagramSource(fsLike, '/workspace/example.flow', 'dir LR\n\nnode start "开始"')

  assert.deepEqual(writes, [
    {
      path: '/workspace/example.flow',
      content: 'dir LR\n\nnode start "开始"',
    },
  ])
})
