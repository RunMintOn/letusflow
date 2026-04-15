import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('node stylesheet defines the preset type classes and color override variables', () => {
  const source = readFileSync(new URL('../src/webview-app/index.css', import.meta.url), 'utf8')

  assert.match(source, /\.diagram-node--type-default\b/)
  assert.match(source, /\.diagram-node--type-decision\b/)
  assert.match(source, /\.diagram-node--type-start\b/)
  assert.match(source, /\.diagram-node--type-end\b/)
  assert.match(source, /\.diagram-node--type-input\b/)
  assert.match(source, /--node-accent-fill:/)
  assert.match(source, /--node-accent-stroke:/)
  assert.match(source, /--node-accent-stroke-strong:/)
})

test('decision nodes hide their XYFlow handles visually', () => {
  const source = readFileSync(new URL('../src/webview-app/index.css', import.meta.url), 'utf8')

  assert.match(source, /\.diagram-node--type-decision\s+\.react-flow__handle\b/)
  assert.match(source, /opacity:\s*0\s*!important/)
  assert.match(source, /border-color:\s*transparent/)
  assert.match(source, /background:\s*transparent/)
})
