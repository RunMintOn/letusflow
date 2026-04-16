import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('diagram nodes expose four-sided handle ids', async () => {
  const source = await readFile('src/webview-app/components/nodes/DiagramNode.jsx', 'utf8')

  assert.match(source, /id="top-source"/)
  assert.match(source, /id="right-source"/)
  assert.match(source, /id="bottom-source"/)
  assert.match(source, /id="left-source"/)
  assert.match(source, /id="top-target"/)
  assert.match(source, /id="right-target"/)
  assert.match(source, /id="bottom-target"/)
  assert.match(source, /id="left-target"/)
})
