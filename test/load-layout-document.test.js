import test from 'node:test'
import assert from 'node:assert/strict'

import { loadLayoutDocument } from '../src/workspace/loadLayoutDocument.js'
import { toLayoutPath } from '../src/workspace/toLayoutPath.js'

test('maps a flow path to a layout sidecar path', () => {
  assert.equal(
    toLayoutPath('/workspace/example.flow'),
    '/workspace/example.flow.layout.json',
  )
})

test('returns an empty normalized layout when the sidecar is missing', async () => {
  const fsLike = {
    async readFile() {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    },
  }

  const layout = await loadLayoutDocument(fsLike, '/workspace/example.flow.layout.json')

  assert.deepEqual(layout, { version: 1, nodes: {}, groups: {}, edges: {} })
})
