import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('flow canvas defaults to read-first chrome', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.doesNotMatch(source, /MiniMap/)
  assert.match(source, /showInteractive=\{false\}/)
  assert.match(source, /hideAttribution: true/)
  assert.doesNotMatch(source, /\sfitView[\s>]/)
  assert.match(source, /fitView\(\{ padding: 0\.18/)
  assert.match(source, /defaultViewport=\{resolvedInitialViewport\}/)
})

test('flow canvas exposes a spacing preview class hook', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /isSpacingPreviewActive/)
  assert.match(source, /flow-canvas--spacing-preview/)
})

test('flow canvas only performs explicit fit requests', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /fitViewOnLoad/)
  assert.match(source, /fitViewRequestToken/)
  assert.match(source, /useNodesInitialized/)
  assert.match(source, /onMoveEnd/)
})

test('flow canvas falls back to a safe default viewport when none is provided', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /resolvedInitialViewport/)
  assert.match(source, /initialViewport \?\? \{ x: 0, y: 0, zoom: 1 \}/)
})

test('flow canvas exposes background style class hooks', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /backgroundStyle/)
  assert.match(source, /flow-canvas--paper/)
  assert.match(source, /flow-canvas--obsidian/)
  assert.match(source, /flow-canvas--gradient/)
})

test('flow canvas uses a dedicated obsidian dot-grid layer', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /ObsidianDotGridBackground/)
  assert.match(source, /backgroundStyle === 'obsidian'/)
  assert.match(source, /variant=\{BackgroundVariant\.Dots\}/)
})

test('flow canvas disables double-click zoom and limits panning to right-drag', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /zoomOnDoubleClick=\{false\}/)
  assert.match(source, /zoomOnPinch=\{false\}/)
  assert.match(source, /panOnDrag=\{\[2\]\}/)
  assert.match(source, /onPaneContextMenu=\{\(event\) => event\.preventDefault\(\)\}/)
})
