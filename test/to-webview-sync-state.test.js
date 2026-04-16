import test from 'node:test'
import assert from 'node:assert/strict'

import { toWebviewSyncState } from '../src/webview/toWebviewSyncState.js'

test('builds a sync payload from graph, layout, and view state', () => {
  const payload = toWebviewSyncState(
    {
      sourcePath: '/workspace/example.flow',
      graph: { direction: 'LR', nodes: [], edges: [] },
      layout: { nodes: {} },
      routeC: {
        enabled: true,
        viewModel: {
          nodes: [],
          groups: [],
          edges: [],
        },
      },
      documentError: null,
    },
    {
      layoutSpacing: 135,
      backgroundStyle: 'obsidian',
      viewport: { x: 12, y: 24, zoom: 1.2 },
    },
    {
      fitViewOnLoad: true,
      fitViewRequestToken: 3,
    },
  )

  assert.deepEqual(payload, {
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    routeC: {
      enabled: true,
      viewModel: {
        nodes: [],
        groups: [],
        edges: [],
      },
    },
    layoutSpacing: 135,
    backgroundStyle: 'obsidian',
    viewport: { x: 12, y: 24, zoom: 1.2 },
    documentError: null,
    fitViewOnLoad: true,
    fitViewRequestToken: 3,
  })
})
