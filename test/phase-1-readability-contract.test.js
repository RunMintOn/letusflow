import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('diagram node labels use a larger font for phase-1 readability', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')

  assert.match(
    source,
    /\.diagram-node__label\s*\{[\s\S]*font-size:\s*(14|15)px;/,
  )
})

test('normal read edge path uses a curved XYFlow path helper', async () => {
  const source = await readFile('src/webview-app/components/edges/normalReadEdgePath.js', 'utf8')

  assert.match(source, /getBezierPath|getSmoothStepPath/)
  assert.doesNotMatch(source, /getStraightPath/)
})
