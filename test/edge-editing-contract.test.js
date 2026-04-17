import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('webview wires existing edges through reconnect handling', async () => {
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')
  const canvasSource = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(appSource, /type:\s*'reconnectEdge'/)
  assert.match(appSource, /const reconnectSuccessfulRef/)
  assert.match(appSource, /const handleReconnectStart/)
  assert.match(appSource, /const handleReconnect/)
  assert.match(appSource, /const handleReconnectEnd/)
  assert.match(appSource, /type:\s*'deleteEdge'/)
  assert.match(canvasSource, /onReconnect/)
  assert.match(canvasSource, /onReconnectStart/)
  assert.match(canvasSource, /onReconnectEnd/)
  assert.match(canvasSource, /onReconnect=\{onReconnect\}/)
  assert.match(canvasSource, /onReconnectStart=\{onReconnectStart\}/)
  assert.match(canvasSource, /onReconnectEnd=\{onReconnectEnd\}/)
})

test('failed edge reconnect deletes the edge instead of snapping back', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /reconnectSuccessfulRef\.current = false/)
  assert.match(source, /reconnectSuccessfulRef\.current = true/)
  assert.match(source, /if \(reconnectSuccessfulRef\.current\)/)
  assert.match(source, /filter\(\(currentEdge\) => \(currentEdge\.data\?\.edgeId \?\? currentEdge\.id\) !== edgeId\)/)
})

test('edge editor exposes an explicit delete action', async () => {
  const source = await readFile('src/webview-app/components/FloatingEdgeEditor.jsx', 'utf8')

  assert.match(source, /onDeleteEdge/)
  assert.match(source, /删除连线/)
})

test('host handles reconnectEdge and persists the updated edge layout', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const reconnectBlock = source.match(/if \(message\?\.type === 'reconnectEdge'[\s\S]*?return\n      \}/)?.[0]

  assert.ok(reconnectBlock)
  assert.match(reconnectBlock, /persistLayout\(/)
  assert.match(reconnectBlock, /sourceSide/)
  assert.match(reconnectBlock, /targetSide/)
})
