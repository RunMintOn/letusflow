import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('normal read edge accepts edge data before reading decision clipping metadata', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /labelBgBorderRadius,\s*data,\s*\}/)
  assert.match(source, /sourceNode:\s*data\?\.sourceNode/)
  assert.match(source, /targetNode:\s*data\?\.targetNode/)
})
