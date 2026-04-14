import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('canvas-first layout keeps an explicit viewport height for the flow canvas', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')
  const flowCanvasBlock = source.match(/\.flow-canvas\s*\{[\s\S]*?\n\}/)?.[0]

  assert.ok(flowCanvasBlock)
  assert.match(flowCanvasBlock, /(?:^|\n)\s*height:\s*100vh;/)
})

test('canvas decoration layer stays behind the react-flow layer', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')
  const beforeBlock = source.match(/\.flow-canvas::before\s*\{[\s\S]*?\n\}/)?.[0]
  const reactFlowBlock = source.match(/\.flow-canvas > \.react-flow\s*\{[\s\S]*?\n\}/)?.[0]

  assert.ok(beforeBlock)
  assert.ok(reactFlowBlock)
  assert.match(beforeBlock, /(?:^|\n)\s*z-index:\s*0;/)
  assert.match(reactFlowBlock, /(?:^|\n)\s*z-index:\s*1\s*!important;/)
})
