import test from 'node:test'
import assert from 'node:assert/strict'

import { createWebviewDocumentModel } from '../src/extension-helpers/createWebviewDocumentModel.js'

test('creates a webview document model with script and style uris', () => {
  const fakeWebview = {
    asWebviewUri(uri) {
      return { toString: () => `webview:${uri.path}` }
    },
  }

  const fakeJoinPath = (...parts) => ({
    path: parts.map((part) => (typeof part === 'string' ? part : part.path)).join('/'),
  })

  const model = createWebviewDocumentModel(
    fakeWebview,
    {
      sourcePath: '/workspace/example.flow',
      sourceText: 'dir LR',
      graph: { direction: 'LR', nodes: [], edges: [] },
      layout: { nodes: {} },
    },
    { path: '/extension-root' },
    fakeJoinPath,
  )

  assert.match(model.webviewScriptUri, /webview:\/extension-root\/dist\/webview\/webview-app\.js/)
  assert.match(model.webviewStyleUri, /webview:\/extension-root\/dist\/webview\/webview-app\.css/)
  assert.equal('layoutPath' in model, false)
})
