import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('zoom controls are docked on the right side as a vertical rail', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')
  const controlsBlock = source.match(/\.react-flow__panel\.react-flow__controls\s*\{([^}]*)\}/)?.[1] ?? ''

  assert.ok(controlsBlock, 'expected a .react-flow__panel.react-flow__controls CSS block')
  assert.match(controlsBlock, /position:\s*absolute;/)
  assert.match(controlsBlock, /right:\s*16px;/)
  assert.match(controlsBlock, /top:\s*50%;/)
  assert.match(controlsBlock, /bottom:\s*auto;/)
  assert.match(controlsBlock, /left:\s*auto;/)
  assert.match(controlsBlock, /transform:\s*translateY\(-50%\);/)
})
