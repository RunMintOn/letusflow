import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('top toolbar exposes straight and bezier edge mode choices', async () => {
  const source = await readFile('src/webview-app/components/TopToolbar.jsx', 'utf8')

  assert.match(source, /edgeRenderMode/)
  assert.match(source, /onEdgeRenderModeChange/)
  assert.match(source, /value="straight"/)
  assert.match(source, /直线/)
  assert.match(source, /value="default"/)
  assert.match(source, /曲线/)
})

test('top toolbar exposes layout spacing slider', async () => {
  const source = await readFile('src/webview-app/components/TopToolbar.jsx', 'utf8')

  assert.match(source, /layoutSpacing/)
  assert.match(source, /onLayoutSpacingChange/)
  assert.match(source, /type="range"/)
  assert.match(source, /min="30"/)
  assert.match(source, /max="150"/)
  assert.match(source, /step="5"/)
  assert.match(source, /间距/)
})

test('top toolbar updates layout spacing continuously while dragging', async () => {
  const source = await readFile('src/webview-app/components/TopToolbar.jsx', 'utf8')

  assert.match(source, /onChange=\{\(event\) => onLayoutSpacingChange\(event\.target\.value\)\}/)
  assert.doesNotMatch(source, /draftLayoutSpacing/)
  assert.doesNotMatch(source, /onPointerUp=/)
  assert.doesNotMatch(source, /onBlur=/)
})
