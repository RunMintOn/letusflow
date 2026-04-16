import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { parseDiagram } from '../src/model/parseDiagram.js'
import { runRouteCLayout } from '../src/model/layout/runRouteCLayout.js'

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

test('route c keeps the accorda overview in a mermaid-like readable footprint', async () => {
  const source = await readFile('test/fixtures/accorda-full-overview.flow', 'utf8')
  const graph = parseDiagram(source)
  const result = await runRouteCLayout(graph)

  const nodes = result.viewModel.nodes
  const minX = Math.min(...nodes.map((node) => node.position.x))
  const maxX = Math.max(...nodes.map((node) => node.position.x + node.style.width))
  const minY = Math.min(...nodes.map((node) => node.position.y))
  const maxY = Math.max(...nodes.map((node) => node.position.y + node.style.height))

  assert.ok(maxX - minX <= 1000)
  assert.ok(maxY - minY <= 1500)
  assert.ok(result.viewModel.groups.length >= 3)
  assert.ok(result.viewModel.edges.some((edge) => (edge.data.sections ?? []).length > 0))
  assert.equal(result.viewModel.edges.every((edge) => typeof edge.id === 'string' && edge.id.length > 0), true)
})
