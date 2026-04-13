import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('flow canvas defaults to read-first chrome', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.doesNotMatch(source, /MiniMap/)
  assert.match(source, /showInteractive=\{false\}/)
  assert.match(source, /hideAttribution: true/)
  assert.match(source, /fitViewOptions=\{\{ padding: 0\.18 \}\}/)
})

test('flow canvas exposes a spacing preview class hook', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /isSpacingPreviewActive/)
  assert.match(source, /flow-canvas--spacing-preview/)
})
