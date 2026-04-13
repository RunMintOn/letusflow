import test from 'node:test'
import assert from 'node:assert/strict'

import { renderGraphHtml } from '../src/webview/renderGraphHtml.js'

test('renders graph labels and serialized data into the webview html', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: {
      direction: 'LR',
      nodes: [
        { id: 'start', label: '开始' },
        { id: 'review', label: '审批' },
      ],
      edges: [{ from: 'start', to: 'review' }],
    },
    layout: {
      nodes: {
        start: { x: 80, y: 120, w: 140, h: 56 },
        review: { x: 300, y: 120, w: 140, h: 56 },
      },
    },
  })

  assert.match(html, /开始/)
  assert.match(html, /审批/)
  assert.match(html, /window\.__DIAGRAM_DOCUMENT__/)
  assert.match(html, /<svg/)
})
