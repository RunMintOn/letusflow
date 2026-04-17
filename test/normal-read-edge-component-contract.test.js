import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('normal read edge accepts edge data before reading decision clipping metadata', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /labelBgBorderRadius,\s*data,\s*\}/)
  assert.match(source, /sourceNode:\s*data\?\.sourceNode/)
  assert.match(source, /targetNode:\s*data\?\.targetNode/)
})

test('normal read edge keeps labels attached to live edge geometry instead of persisted label boxes', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.doesNotMatch(source, /labelLayout/)
  assert.match(source, /labelX=\{geometry\.label\.x\}/)
  assert.match(source, /labelY=\{geometry\.label\.y\}/)
})
