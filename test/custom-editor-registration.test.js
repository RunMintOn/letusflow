import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('extension registers the .flow custom text editor provider', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')

  assert.match(source, /registerCustomEditorProvider/)
  assert.match(source, /diagramEditor\.flowEditor/)
  assert.match(source, /resolveCustomTextEditor/)
})

test('extension no longer registers the preview command entrypoint', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')

  assert.doesNotMatch(source, /registerCommand/)
  assert.doesNotMatch(source, /openPreview/)
})
