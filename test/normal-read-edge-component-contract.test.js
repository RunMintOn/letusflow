import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('normal read edge accepts edge data before reading decision clipping metadata', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /labelBgBorderRadius,\s*data,\s*\}/)
  assert.match(source, /sourceNode:\s*data\?\.sourceNode/)
  assert.match(source, /targetNode:\s*data\?\.targetNode/)
})

test('normal read edge prefers labelLayout from edge data when present', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /labelLayout/)
  assert.match(source, /data\?\.labelLayout/)
  assert.match(source, /labelX=\{/)
  assert.match(source, /labelY=\{/)
})

test('normal read edge forwards precomputed routing sections into path resolution', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /sections:\s*data\?\.sections/)
})
