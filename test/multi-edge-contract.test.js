import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('custom flow editor prefers edgeId for edge delete and rename operations', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /message\?\.edgeId/)
  assert.match(source, /edgeId:\s*message\.edgeId/)
})

test('webview app tracks selected edges by edgeId', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /edgeId:/)
  assert.match(source, /selectedElement\?\.edgeId/)
})
