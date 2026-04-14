import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('floating canvas controls expose edge mode choices through the display menu', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.match(source, /edgeRenderMode/)
  assert.match(source, /onEdgeRenderModeChange/)
  assert.match(source, /Display/)
  assert.match(source, /直线/)
  assert.match(source, /曲线/)
  assert.doesNotMatch(source, /<select/)
})

test('floating canvas controls keep the layout spacing slider visible', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.match(source, /layoutSpacing/)
  assert.match(source, /onLayoutSpacingChange/)
  assert.match(source, /type="range"/)
  assert.match(source, /min="30"/)
  assert.match(source, /max="150"/)
  assert.match(source, /step="5"/)
  assert.match(source, /间距/)
})

test('floating canvas controls expose background style choices', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.match(source, /backgroundStyle/)
  assert.match(source, /onBackgroundStyleChange/)
  assert.match(source, /纸面/)
  assert.match(source, /点阵/)
  assert.match(source, /渐变/)
})

test('app renders floating controls instead of the old toolbar and inspector', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /FloatingCanvasControls/)
  assert.match(source, /FloatingEdgeEditor/)
  assert.match(source, /canvas-create-node/)
  assert.doesNotMatch(source, /TopToolbar/)
  assert.doesNotMatch(source, /InspectorPanel/)
})
