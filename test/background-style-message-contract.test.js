import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('extension tracks background style as host view state', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')

  assert.match(source, /backgroundStyle/)
  assert.match(source, /message\?\.type === 'setBackgroundStyle'/)
  assert.match(source, /workspaceState/)
})

test('background style updates do not persist graph data', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')
  const block = source.match(/if \(message\?\.type === 'setBackgroundStyle'\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.doesNotMatch(block, /persistGraph\(\)/)
  assert.doesNotMatch(block, /documentModel\.graph\s*=/)
})
