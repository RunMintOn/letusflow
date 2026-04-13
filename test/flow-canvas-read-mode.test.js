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
