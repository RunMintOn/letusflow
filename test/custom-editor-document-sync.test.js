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

test('custom flow editor falls back to fs writes without using throw-driven control flow', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /const applied = await vscode\.workspace\.applyEdit\(edit\)/)
  assert.match(source, /if \(applied\) \{/)
  assert.match(source, /await saveDiagramSource\(fsLike, sourcePath, sourceText\)/)
  assert.doesNotMatch(source, /throw new Error\('applyEdit failed'\)/)
})

test('custom flow editor surfaces unexpected host errors to the user', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /showErrorMessage/)
  assert.match(source, /Diagram editor failed:/)
})
