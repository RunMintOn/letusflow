import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('normal read edge accepts edge data before reading decision clipping metadata', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /labelBgBorderRadius,\s*data,\s*selected,\s*\}/)
  assert.match(source, /sourceNode:\s*data\?\.sourceNode/)
  assert.match(source, /targetNode:\s*data\?\.targetNode/)
})

test('normal read edge keeps labels attached to live edge geometry instead of persisted label boxes', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.doesNotMatch(source, /labelLayout/)
  assert.match(source, /labelX=\{geometry\.label\.x\}/)
  assert.match(source, /labelY=\{geometry\.label\.y\}/)
})

test('normal read edge adds explicit selected-state styling and larger hit area', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /selected/)
  assert.match(source, /interactionWidth=/)
  assert.match(source, /strokeWidth:\s*selected/)
  assert.match(source, /const resolvedMarkerEnd = selected/)
})

test('edge labels use a subdued canvas-like background instead of the default bright pill', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')

  assert.match(source, /\.react-flow__edge-textbg/)
  assert.match(source, /fill:\s*color-mix\(in srgb, var\(--panel\)/)
  assert.match(source, /stroke:\s*color-mix\(in srgb, var\(--border\)/)
})
