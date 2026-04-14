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
  assert.doesNotMatch(setSpacingBlock, /await rerender\(\)/)
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

test('host preserves edge render mode across spacing rerenders', async () => {
  const extensionSource = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(extensionSource, /edgeRenderMode\s*=\s*'straight'/)
  assert.match(extensionSource, /edgeRenderMode,/)
  assert.match(extensionSource, /message\?\.type === 'setEdgeRenderMode'/)
  assert.match(appSource, /initialDocument\.edgeRenderMode/)
  assert.match(appSource, /type: 'setEdgeRenderMode'/)
})

test('webview app posts viewport updates and fit requests separately', async () => {
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(appSource, /type: 'setViewport'/)
  assert.match(appSource, /fitViewOnLoad/)
  assert.match(appSource, /fitViewRequestToken/)
})

test('webview app preserves background style and posts updates to host', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /initialDocument\.backgroundStyle/)
  assert.match(source, /setBackgroundStyle/)
  assert.match(source, /type: 'setBackgroundStyle'/)
})
