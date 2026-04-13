import test from 'node:test'
import assert from 'node:assert/strict'

import { renderGraphHtml } from '../src/webview/renderGraphHtml.js'

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
