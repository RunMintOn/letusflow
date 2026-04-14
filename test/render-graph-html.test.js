import test from 'node:test'
import assert from 'node:assert/strict'

import { isIgnorableBootErrorMessage, renderGraphHtml } from '../src/webview/renderGraphHtml.js'

test('injects serialized document payload and bundle references into the webview shell', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: {
      direction: 'LR',
      nodes: [{ id: 'start', label: '开始' }],
      edges: [],
    },
    layout: {
      nodes: {
        start: { x: 80, y: 120, w: 140, h: 56 },
      },
    },
    webviewScriptUri: 'vscode-resource:/dist/webview/webview-app.js',
    webviewStyleUri: 'vscode-resource:/dist/webview/webview-app.css',
  })

  assert.match(html, /window\.__DIAGRAM_DOCUMENT__/)
  assert.match(html, /vscode-resource:\/dist\/webview\/webview-app\.js/)
  assert.match(html, /vscode-resource:\/dist\/webview\/webview-app\.css/)
  assert.match(html, /<div id="app"><\/div>/)
})

test('does not expose layoutPath in the webview payload', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    layoutPath: '/workspace/example.flow.layout.json',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
  })

  assert.doesNotMatch(html, /layoutPath/)
  assert.doesNotMatch(html, /example\.flow\.layout\.json/)
})

test('preserves view-only spacing, edge mode, and viewport state in the webview payload', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    layoutSpacing: 135,
    edgeRenderMode: 'default',
    viewport: { x: 12, y: -18, zoom: 0.9 },
    fitViewOnLoad: true,
  })

  assert.match(html, /"layoutSpacing":135/)
  assert.match(html, /"edgeRenderMode":"default"/)
  assert.match(html, /"viewport":\{"x":12,"y":-18,"zoom":0\.9\}/)
  assert.match(html, /"fitViewOnLoad":true/)
})

test('preserves background style in the webview payload', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    backgroundStyle: 'obsidian',
  })

  assert.match(html, /"backgroundStyle":"obsidian"/)
})

test('ignores benign ResizeObserver loop warnings in boot status handling', () => {
  assert.equal(
    isIgnorableBootErrorMessage('ResizeObserver loop completed with undelivered notifications.'),
    true,
  )
  assert.equal(isIgnorableBootErrorMessage('ResizeObserver loop limit exceeded'), true)
  assert.equal(isIgnorableBootErrorMessage('TypeError: failed to load graph'), false)
})
