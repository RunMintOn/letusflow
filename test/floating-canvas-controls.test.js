import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('floating canvas controls keep display controls focused on background only', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.doesNotMatch(source, /edgeRenderMode/)
  assert.doesNotMatch(source, /onEdgeRenderModeChange/)
  assert.match(source, /Display/)
  assert.doesNotMatch(source, /直线/)
  assert.doesNotMatch(source, /曲线/)
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
  assert.match(source, /canvas-hud--right/)
  assert.match(source, /canvas-slider--vertical/)
  assert.match(source, /canvas-slider__header/)
  assert.match(source, /canvas-slider__input-wrap/)
})

test('floating canvas controls expose create-node and drag toggle actions in the right-side stack', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.match(source, /onCreateNode/)
  assert.match(source, /onNodeDraggingToggle/)
  assert.match(source, /isNodeDraggingEnabled/)
  assert.match(source, /新增节点/)
  assert.match(source, /拖拽/)
  assert.match(source, /canvas-hud--actions/)
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
  assert.match(source, /isNodeDraggingEnabled/)
  assert.match(source, /handleNodeDraggingToggle/)
  assert.match(source, /window\.confirm/)
  assert.match(source, /整理布局/)
  assert.doesNotMatch(source, /TopToolbar/)
  assert.doesNotMatch(source, /InspectorPanel/)
})
