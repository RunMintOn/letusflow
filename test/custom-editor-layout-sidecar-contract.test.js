import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('host persists layout sidecars separately from flow source', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /persistLayoutDocument/)
  assert.match(source, /saveLayoutDocument/)
  assert.match(source, /layoutPath/)
})

test('autoLayout persists the reconciled layout sidecar', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'autoLayout'\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.match(block, /persistLayout\(/)
  assert.doesNotMatch(block, /persistGraph\(/)
})
