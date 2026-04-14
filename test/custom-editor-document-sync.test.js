import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('custom flow editor listens for text document changes', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /onDidChangeTextDocument/)
  assert.match(source, /event\.document\.uri\.toString\(\) === document\.uri\.toString\(\)/)
  assert.match(source, /setTimeout/)
})

test('custom flow editor preserves view state when rerendering from text changes', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /layoutSpacing/)
  assert.match(source, /edgeRenderMode/)
  assert.match(source, /backgroundStyle/)
  assert.match(source, /viewport/)
})

test('custom flow editor no longer relies on active text editor lookup', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.doesNotMatch(source, /activeTextEditor/)
  assert.doesNotMatch(source, /createWebviewPanel/)
})
