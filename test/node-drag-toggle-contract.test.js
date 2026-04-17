import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('app defaults node dragging to on and wires the toggle into flow canvas', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /const \[isNodeDraggingEnabled, setIsNodeDraggingEnabled\] = React\.useState\(true\)/)
  assert.match(source, /nodesDraggable=\{isNodeDraggingEnabled\}/)
  assert.match(source, /isNodeDraggingEnabled=\{isNodeDraggingEnabled\}/)
  assert.match(source, /onNodeDraggingToggle=\{handleNodeDraggingToggle\}/)
})
