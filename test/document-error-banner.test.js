import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('webview app renders a document error banner when parser errors exist', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /documentError/)
  assert.match(source, /app-document-error/)
  assert.match(source, /上一次有效图/)
})
