import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('app registers custom edge renderers for both normal and feedback edges', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /NormalReadEdge/)
  assert.match(source, /readEdge: NormalReadEdge/)
  assert.match(source, /feedbackEdge: FeedbackEdge/)
})
