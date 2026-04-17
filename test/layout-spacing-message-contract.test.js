import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('extension handles layout spacing as view state without persisting graph source', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /layoutSpacing\s*=\s*100/)
  assert.match(source, /autoLayoutCurrentGraph/)
  assert.match(source, /message\?\.type === 'setSpacing'/)
  assert.match(source, /postHostDebug\(webviewPanel, `setSpacing applied:/)

  const setSpacingBlock = source.match(/if \(message\?\.type === 'setSpacing'\) \{[\s\S]*?return\n      \}/)?.[0]
  assert.ok(setSpacingBlock)
  assert.doesNotMatch(setSpacingBlock, /persistGraph\(\)/)
  assert.doesNotMatch(setSpacingBlock, /documentModel\.layout\s*=/)
  assert.match(setSpacingBlock, /await postSyncState\(\)/)
})

test('extension stores viewport as view state without rerendering', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /message\?\.type === 'setViewport'/)
  assert.match(source, /viewport\s*=/)

  const setViewportBlock = source.match(/if \(message\?\.type === 'setViewport'\) \{[\s\S]*?return\n      \}/)?.[0]
  assert.ok(setViewportBlock)
  assert.doesNotMatch(setViewportBlock, /await rerender\(\)/)
  assert.doesNotMatch(setViewportBlock, /documentModel\.layout\s*=/)
})

test('webview app debounces layout spacing messages to host', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /layoutSpacing/)
  assert.match(source, /setLayoutSpacing\(value\)/)
  assert.match(source, /setSpacing/)
  assert.match(source, /setTimeout/)
  assert.match(source, /type: 'setSpacing'/)
  assert.match(source, /200/)
})

test('webview app enables short-lived preview motion while spacing changes', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /isSpacingPreviewActive/)
  assert.match(source, /spacingPreviewTimeoutRef/)
  assert.match(source, /setIsSpacingPreviewActive\(true\)/)
  assert.match(source, /setIsSpacingPreviewActive\(false\)/)
})

test('host no longer tracks edge render mode as a view state', async () => {
  const extensionSource = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.doesNotMatch(extensionSource, /edgeRenderMode/)
  assert.doesNotMatch(extensionSource, /setEdgeRenderMode/)
  assert.doesNotMatch(appSource, /initialDocument\.edgeRenderMode/)
  assert.doesNotMatch(appSource, /type: 'setEdgeRenderMode'/)
})

test('webview app posts viewport updates and fit requests separately', async () => {
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(appSource, /type: 'setViewport'/)
  assert.match(appSource, /fitViewOnLoad/)
  assert.match(appSource, /fitViewRequestToken/)
})

test('webview app listens for syncState and updates live state', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /window\.addEventListener\('message'/)
  assert.match(source, /syncState/)
  assert.match(source, /setDocumentModel\(message\.payload\)/)
})

test('webview app only previews spacing layouts while preview mode is active', async () => {
  const stateSource = await readFile('src/webview-app/state/useEditorState.jsx', 'utf8')
  const layoutSource = await readFile('src/webview-app/state/toEditorLayout.js', 'utf8')
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(stateSource, /isSpacingPreviewActive/)
  assert.match(layoutSource, /isSpacingPreviewActive/)
  assert.match(appSource, /isSpacingPreviewActive/)
})

test('edge edits no longer recompute host layout automatically', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const deleteEdgeBlock = source.match(/if \(message\?\.type === 'deleteEdge'\) \{[\s\S]*?return\n      \}/)?.[0]
  const createEdgeBlock = source.match(/if \(message\?\.type === 'createEdge' && message\.edge\) \{[\s\S]*?\n      \}/)?.[0]

  assert.ok(deleteEdgeBlock)
  assert.ok(createEdgeBlock)
  assert.doesNotMatch(deleteEdgeBlock, /documentModel\.layout\s*=\s*autoLayoutCurrentGraph\(\)/)
  assert.doesNotMatch(createEdgeBlock, /documentModel\.layout\s*=\s*autoLayoutCurrentGraph\(\)/)
})

test('deleteNode preserves remaining layout instead of auto-layouting', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'deleteNode' && message\.nodeId\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.doesNotMatch(block, /documentModel\.layout\s*=\s*autoLayoutCurrentGraph\(\)/)
  assert.match(block, /nodes:\s*Object\.fromEntries/)
})

test('createSuccessorNode uses local placement instead of host auto-layout', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'createSuccessorNode' && message\.nodeId\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.match(block, /placeSuccessorNode/)
  assert.match(block, /reconcileLayout/)
  assert.doesNotMatch(block, /documentModel\.layout\s*=\s*autoLayoutCurrentGraph\(\)/)
})

test('autoLayout no longer forces fitView during incremental sync', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'autoLayout'\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.doesNotMatch(block, /fitViewRequestToken \+= 1/)
  assert.doesNotMatch(block, /fitViewOnLoad:\s*true/)
  assert.match(block, /postSyncState\(/)
})

test('webview app preserves background style and posts updates to host', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /initialDocument\.backgroundStyle/)
  assert.match(source, /setBackgroundStyle/)
  assert.match(source, /type: 'setBackgroundStyle'/)
})
