import test from 'node:test'
import assert from 'node:assert/strict'

test('initial document can opt into route-c without breaking the legacy shape', () => {
  const initialDocument = {
    sourcePath: 'demo.flow',
    graph: { direction: 'TD', groups: [], nodes: [], edges: [] },
    layout: { nodes: {}, edgeLabels: {} },
    routeC: {
      enabled: false,
      viewModel: null,
    },
  }

  assert.equal(initialDocument.routeC.enabled, false)
  assert.equal(initialDocument.routeC.viewModel, null)
  assert.deepEqual(initialDocument.layout.nodes, {})
  assert.deepEqual(initialDocument.layout.edgeLabels, {})
})
