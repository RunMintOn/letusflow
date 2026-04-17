import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('diagram nodes expose inline edit controls', async () => {
  const source = await readFile('src/webview-app/components/nodes/DiagramNode.jsx', 'utf8')

  assert.match(source, /data\.isEditing/)
  assert.match(source, /diagram-node__input/)
  assert.match(source, /onEditChange/)
  assert.match(source, /onEditSubmit/)
  assert.match(source, /onEditCancel/)
  assert.match(source, /event\.key === 'Enter'/)
  assert.match(source, /event\.key === 'Escape'/)
})

test('flow canvas forwards node double click events for inline editing', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /onNodeDoubleClick/)
  assert.match(source, /onNodeDrag/)
})

test('app manages inline node edit state', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /editingNodeId/)
  assert.match(source, /editingNodeLabel/)
  assert.match(source, /handleNodeDoubleClick/)
  assert.match(source, /handlePaneClick/)
  assert.match(source, /event\.detail >= 2/)
  assert.match(source, /handleCreateNode\(\)/)
  assert.match(source, /submitNodeEditing/)
  assert.match(source, /cancelNodeEditing/)
})
