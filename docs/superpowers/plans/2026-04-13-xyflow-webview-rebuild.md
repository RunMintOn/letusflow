# XYFlow Webview Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current string-built SVG webview with a React + `@xyflow/react` webview app while keeping `.flow` and `.flow.layout.json` compatible and adding first-class node/edge creation support.

**Architecture:** Keep the existing parser, serializer, layout sidecar, and extension-host file IO as the source-of-truth pipeline. Introduce a bundled React webview app that maps `documentModel` to XYFlow nodes/edges, emits explicit edit messages back to the extension host, and lets the host continue writing `.flow` and `.flow.layout.json`.

**Tech Stack:** VS Code extension API, React, `@xyflow/react`, esbuild, Node.js built-ins, `node:test`, `node:assert`

---

### Task 1: Add the webview app toolchain and bundle target

**Files:**
- Modify: `package.json`
- Create: `esbuild.webview.mjs`
- Create: `src/webview-app/main.jsx`
- Create: `src/webview-app/App.jsx`
- Create: `src/webview-app/index.css`
- Test: `test/render-graph-html.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { renderGraphHtml } from '../src/webview/renderGraphHtml.js'

test('renders a bundled webview entry instead of inline app logic', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
  })

  assert.match(html, /webview-app\.js/)
  assert.doesNotMatch(html, /const buildEdgeGeometry = eval/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `renderGraphHtml` still embeds inline application logic and no `webview-app.js` bundle exists.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "build:webview": "node esbuild.webview.mjs",
    "build": "npm run build:webview",
    "test": "node --test test/*.test.js"
  },
  "dependencies": {
    "@xyflow/react": "^12.8.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "esbuild": "^0.25.0"
  }
}
```

```js
import esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/webview-app/main.jsx'],
  bundle: true,
  outfile: 'dist/webview/webview-app.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  loader: { '.css': 'css' },
})
```

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import './index.css'

createRoot(document.getElementById('app')).render(<App />)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with `renderGraphHtml` now referencing `webview-app.js`.

- [ ] **Step 5: Commit**

```bash
git add package.json esbuild.webview.mjs src/webview-app/main.jsx src/webview-app/App.jsx src/webview-app/index.css test/render-graph-html.test.js
git commit -m "build: scaffold xyflow webview bundle"
```

### Task 2: Split HTML shell generation from the app runtime

**Files:**
- Modify: `src/webview/renderGraphHtml.js`
- Create: `src/webview/buildWebviewDocumentPayload.js`
- Test: `test/render-graph-html.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
  assert.match(html, /<div id="app"><\/div>/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `renderGraphHtml` still assumes inline rendering and does not render a mount point plus asset URIs.

- [ ] **Step 3: Write minimal implementation**

```js
export function buildWebviewDocumentPayload(documentModel) {
  return JSON.stringify({
    sourcePath: documentModel.sourcePath,
    layoutPath: documentModel.layoutPath,
    graph: documentModel.graph,
    layout: documentModel.layout,
  })
}
```

```js
export function renderGraphHtml(documentModel) {
  return `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <link rel="stylesheet" href="${documentModel.webviewStyleUri}">
    </head>
    <body>
      <div id="app"></div>
      <script>window.__DIAGRAM_DOCUMENT__ = ${buildWebviewDocumentPayload(documentModel)}</script>
      <script src="${documentModel.webviewScriptUri}"></script>
    </body>
  </html>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with the HTML shell no longer embedding runtime logic.

- [ ] **Step 5: Commit**

```bash
git add src/webview/renderGraphHtml.js src/webview/buildWebviewDocumentPayload.js test/render-graph-html.test.js
git commit -m "refactor: split webview shell from runtime app"
```

### Task 3: Add XYFlow mapping helpers and app state

**Files:**
- Create: `src/webview-app/state/useEditorState.jsx`
- Create: `src/webview-app/mapping/toFlowNodes.js`
- Create: `src/webview-app/mapping/toFlowEdges.js`
- Create: `src/webview-app/mapping/fromNodeChanges.js`
- Create: `src/webview-app/mapping/fromConnectParams.js`
- Create: `test/to-flow-nodes.test.js`
- Create: `test/to-flow-edges.test.js`
- Create: `test/from-connect-params.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toFlowNodes } from '../src/webview-app/mapping/toFlowNodes.js'

test('maps graph nodes and layout entries to XYFlow nodes', () => {
  const nodes = toFlowNodes(
    [{ id: 'start', label: '开始' }],
    { nodes: { start: { x: 80, y: 120, w: 140, h: 56 } } },
  )

  assert.deepEqual(nodes, [
    {
      id: 'start',
      type: 'diagramNode',
      position: { x: 80, y: 120 },
      data: { label: '开始' },
      style: { width: 140, height: 56 },
    },
  ])
})
```

```js
import { toFlowEdges } from '../src/webview-app/mapping/toFlowEdges.js'

test('maps graph edges to stable XYFlow edges', () => {
  const edges = toFlowEdges([
    { from: 'start', to: 'review', label: '通过' },
  ])

  assert.deepEqual(edges, [
    {
      id: 'start->review#0',
      source: 'start',
      target: 'review',
      label: '通过',
      type: 'smoothstep',
    },
  ])
})
```

```js
import { fromConnectParams } from '../src/webview-app/mapping/fromConnectParams.js'

test('maps XYFlow connect params back to graph edge shape', () => {
  assert.deepEqual(
    fromConnectParams({ source: 'start', target: 'review' }),
    { from: 'start', to: 'review', label: undefined },
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the mapping helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export function toFlowNodes(graphNodes, layout) {
  return graphNodes.map((node) => ({
    id: node.id,
    type: 'diagramNode',
    position: {
      x: layout.nodes[node.id].x,
      y: layout.nodes[node.id].y,
    },
    data: { label: node.label },
    style: {
      width: layout.nodes[node.id].w,
      height: layout.nodes[node.id].h,
    },
  }))
}
```

```js
export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge, index) => ({
    id: `${edge.from}->${edge.to}#${index}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: 'smoothstep',
  }))
}
```

```js
export function fromConnectParams(connection) {
  return {
    from: connection.source,
    to: connection.target,
    label: undefined,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the node and edge mapping helpers.

- [ ] **Step 5: Commit**

```bash
git add src/webview-app/state/useEditorState.jsx src/webview-app/mapping/toFlowNodes.js src/webview-app/mapping/toFlowEdges.js src/webview-app/mapping/fromNodeChanges.js src/webview-app/mapping/fromConnectParams.js test/to-flow-nodes.test.js test/to-flow-edges.test.js test/from-connect-params.test.js
git commit -m "feat: add xyflow mapping helpers"
```

### Task 4: Implement the React webview app and draggable flow canvas

**Files:**
- Modify: `src/webview-app/App.jsx`
- Create: `src/webview-app/components/FlowCanvas.jsx`
- Create: `src/webview-app/components/TopToolbar.jsx`
- Create: `src/webview-app/components/InspectorPanel.jsx`
- Create: `src/webview-app/components/nodes/DiagramNode.jsx`
- Create: `src/webview-app/bridge/vscodeBridge.js`
- Modify: `src/webview-app/index.css`
- Test: `test/render-graph-html.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('webview shell includes the React mount point and debug-free runtime handoff', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    webviewScriptUri: 'vscode-resource:/dist/webview/webview-app.js',
    webviewStyleUri: 'vscode-resource:/dist/webview/webview-app.css',
  })

  assert.match(html, /id="app"/)
  assert.doesNotMatch(html, /调试面板/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the old debug-heavy shell is still present.

- [ ] **Step 3: Write minimal implementation**

```jsx
import { ReactFlow, Background, Controls } from '@xyflow/react'

export function FlowCanvas({ nodes, edges, onNodesChange, onConnect, onNodeClick, nodeTypes }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
```

```jsx
export function App() {
  return <div className="app-shell">...</div>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with the shell no longer exposing the old inline debug UI.

- [ ] **Step 5: Commit**

```bash
git add src/webview-app/App.jsx src/webview-app/components/FlowCanvas.jsx src/webview-app/components/TopToolbar.jsx src/webview-app/components/InspectorPanel.jsx src/webview-app/components/nodes/DiagramNode.jsx src/webview-app/bridge/vscodeBridge.js src/webview-app/index.css test/render-graph-html.test.js
git commit -m "feat: render diagram editor with xyflow"
```

### Task 5: Wire the extension host to bundled assets and sync messages

**Files:**
- Modify: `src/extension.cjs`
- Create: `src/extension-helpers/createWebviewDocumentModel.js`
- Modify: `src/workspace/loadDiagramDocument.js`
- Create: `test/extension-message-contract.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { createWebviewDocumentModel } from '../src/extension-helpers/createWebviewDocumentModel.js'

test('creates a webview document model with script and style uris', () => {
  const model = createWebviewDocumentModel(fakeWebview, {
    sourcePath: '/workspace/example.flow',
    layoutPath: '/workspace/example.flow.layout.json',
    sourceText: 'dir LR',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
  })

  assert.match(model.webviewScriptUri, /webview-app\.js/)
  assert.match(model.webviewStyleUri, /webview-app\.css/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the extension host does not yet attach bundled asset URIs to the document model.

- [ ] **Step 3: Write minimal implementation**

```js
function createWebviewDocumentModel(webview, documentModel, extensionUri) {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'webview-app.js'))
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'webview-app.css'))
  return {
    ...documentModel,
    webviewScriptUri: scriptUri.toString(),
    webviewStyleUri: styleUri.toString(),
  }
}
```

```js
panel.webview.onDidReceiveMessage(async (message) => {
  switch (message?.type) {
    case 'moveNodes':
    case 'renameNode':
    case 'createNode':
    case 'createEdge':
      // route through explicit handlers
  }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the bundled asset URI contract.

- [ ] **Step 5: Commit**

```bash
git add src/extension.cjs src/extension-helpers/createWebviewDocumentModel.js src/workspace/loadDiagramDocument.js test/extension-message-contract.test.js
git commit -m "feat: wire extension host to xyflow webview bundle"
```

### Task 6: Implement file-safe rename, create-node, and create-edge writes

**Files:**
- Modify: `src/model/serializeDiagram.js`
- Modify: `src/model/renameNodeLabel.js`
- Create: `src/model/createNode.js`
- Create: `src/model/createEdge.js`
- Create: `src/model/generateNodeId.js`
- Modify: `src/workspace/saveDiagramSource.js`
- Create: `test/create-node.test.js`
- Create: `test/create-edge.test.js`
- Create: `test/generate-node-id.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { createNode } from '../src/model/createNode.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('creates a new node and serializes it back to the DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [{ id: 'start', label: '开始' }],
    edges: [],
  }

  const next = createNode(graph, { id: 'review', label: '审批' })

  assert.match(serializeDiagram(next), /node review "审批"/)
})
```

```js
import { createEdge } from '../src/model/createEdge.js'

test('creates a new edge and serializes it back to the DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = createEdge(graph, { from: 'start', to: 'review' })

  assert.match(serializeDiagram(next), /edge start -> review/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because create-node and create-edge helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export function generateNodeId(existingNodes, baseLabel = 'node') {
  // node, node-2, node-3...
}
```

```js
export function createNode(graph, newNode) {
  return {
    ...graph,
    nodes: [...graph.nodes, newNode],
  }
}
```

```js
export function createEdge(graph, edge) {
  return {
    ...graph,
    edges: [...graph.edges, edge],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for node/edge creation and serialization.

- [ ] **Step 5: Commit**

```bash
git add src/model/serializeDiagram.js src/model/renameNodeLabel.js src/model/createNode.js src/model/createEdge.js src/model/generateNodeId.js src/workspace/saveDiagramSource.js test/create-node.test.js test/create-edge.test.js test/generate-node-id.test.js
git commit -m "feat: support source writes for node and edge creation"
```

### Task 7: Persist XYFlow interactions back to `.flow` and `.layout.json`

**Files:**
- Modify: `src/extension.cjs`
- Modify: `src/model/layout.js`
- Modify: `src/workspace/saveLayoutFile.js`
- Create: `test/save-created-node-layout.test.js`
- Create: `test/move-nodes-message.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { applyMovedNodes } from '../src/model/layout.js'

test('applies XYFlow node positions back into the layout sidecar', () => {
  const next = applyMovedNodes(
    { nodes: { start: { x: 80, y: 120, w: 140, h: 56 } } },
    [{ id: 'start', position: { x: 220, y: 180 } }],
  )

  assert.deepEqual(next.nodes.start, { x: 220, y: 180, w: 140, h: 56 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the host and layout helpers do not yet handle bulk XYFlow move payloads.

- [ ] **Step 3: Write minimal implementation**

```js
export function applyMovedNodes(layout, movedNodes) {
  const next = structuredClone(layout)
  for (const moved of movedNodes) {
    const current = next.nodes[moved.id]
    if (!current) continue
    current.x = Math.round(moved.position.x)
    current.y = Math.round(moved.position.y)
  }
  return next
}
```

```js
case 'moveNodes':
  documentModel.layout = applyMovedNodes(documentModel.layout, message.nodes)
  await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for applying moved nodes and saving the sidecar.

- [ ] **Step 5: Commit**

```bash
git add src/extension.cjs src/model/layout.js src/workspace/saveLayoutFile.js test/save-created-node-layout.test.js test/move-nodes-message.test.js
git commit -m "feat: persist xyflow layout changes"
```

### Task 8: Add example usage, verification, and cleanup

**Files:**
- Modify: `README.md`
- Modify: `example.flow`
- Modify: `example.flow.layout.json`
- Modify: `.vscode/launch.json`

- [ ] **Step 1: Write the failing test**

No code test. Manual verification only for this task.

- [ ] **Step 2: Run verification before docs**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Write minimal documentation**

```md
1. `npm install`
2. `npm run build`
3. Press `F5`
4. Open `example.flow`
5. Run `Diagram Editor: Open Preview`
6. Verify drag, rename, create-node, and create-edge
```

- [ ] **Step 4: Run verification after docs**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md example.flow example.flow.layout.json .vscode/launch.json
git commit -m "docs: document xyflow workflow"
```
