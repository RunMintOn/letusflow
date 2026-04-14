# Structure Edit Incremental Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the hard full-page flash during structure edits by switching host-to-webview updates for graph/layout edits from full HTML rerenders to incremental `syncState` messages, while preserving remaining node positions when a node is deleted.

**Architecture:** Keep the existing full `rerender()` path for initial load and external text-document refreshes, but add a shared webview-state payload builder plus a host `postSyncState()` path for structure-edit mutations. Update the React app to listen for `syncState`, reconcile its live state without remounting, and clear stale selection when deleted nodes or edges disappear.

**Tech Stack:** VS Code webview `postMessage`, React 19, `@xyflow/react`, Node `node:test`, esbuild

---

## File Structure

- Create: `src/webview/toWebviewSyncState.js`
  Responsibility: build the shared plain-object payload used by both initial HTML boot payloads and incremental `syncState` messages.
- Create: `src/webview-app/state/reconcileSelectedElement.js`
  Responsibility: clear or refresh stale node/edge selection after incremental sync removes or replaces selected graph elements.
- Create: `test/to-webview-sync-state.test.js`
  Responsibility: unit-test the shared sync payload builder.
- Create: `test/reconcile-selected-element.test.js`
  Responsibility: unit-test selection cleanup after incremental sync.
- Modify: `src/webview/buildWebviewDocumentPayload.js`
  Responsibility: serialize the shared sync payload for the initial HTML boot path.
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
  Responsibility: add `postSyncState()`, keep `rerender()` for initial/text refresh, and route structure-edit handlers through incremental sync.
- Modify: `src/webview-app/App.jsx`
  Responsibility: receive `syncState`, update live React state, pass synced view props to `FlowCanvas`, and reconcile selection.
- Modify: `test/custom-editor-document-sync.test.js`
  Responsibility: lock in the split between initial/text `rerender()` and structure-edit `postSyncState()`.
- Modify: `test/layout-spacing-message-contract.test.js`
  Responsibility: lock in structure-edit layout behavior, spacing behavior, and `autoLayout` fit-view behavior.

### Task 1: Add failing tests for incremental sync and selection reconciliation

**Files:**
- Create: `test/to-webview-sync-state.test.js`
- Create: `test/reconcile-selected-element.test.js`
- Modify: `test/custom-editor-document-sync.test.js`
- Modify: `test/layout-spacing-message-contract.test.js`

- [ ] **Step 1: Write the failing sync payload helper test**

Create `test/to-webview-sync-state.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toWebviewSyncState } from '../src/webview/toWebviewSyncState.js'

test('builds a sync payload from graph, layout, and view state', () => {
  const payload = toWebviewSyncState(
    {
      sourcePath: '/workspace/example.flow',
      graph: { direction: 'LR', nodes: [], edges: [] },
      layout: { nodes: {} },
      documentError: null,
    },
    {
      layoutSpacing: 135,
      edgeRenderMode: 'default',
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
    layoutSpacing: 135,
    edgeRenderMode: 'default',
    backgroundStyle: 'obsidian',
    viewport: { x: 12, y: 24, zoom: 1.2 },
    documentError: null,
    fitViewOnLoad: true,
    fitViewRequestToken: 3,
  })
})
```

- [ ] **Step 2: Write the failing selection reconciliation test**

Create `test/reconcile-selected-element.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { reconcileSelectedElement } from '../src/webview-app/state/reconcileSelectedElement.js'

test('clears a selected node when incremental sync removes it', () => {
  const next = reconcileSelectedElement(
    { type: 'node', id: 'review' },
    [{ id: 'start' }],
    [],
  )

  assert.equal(next, null)
})

test('refreshes edgeRef from the synced edge when the selected edge still exists', () => {
  const next = reconcileSelectedElement(
    { type: 'edge', id: 'start->done#ok', edgeRef: { from: 'start', to: 'done', label: 'old' } },
    [],
    [
      {
        id: 'start->done#ok',
        data: { edgeRef: { from: 'start', to: 'done', label: 'ok' } },
      },
    ],
  )

  assert.deepEqual(next, {
    type: 'edge',
    id: 'start->done#ok',
    edgeRef: { from: 'start', to: 'done', label: 'ok' },
  })
})
```

- [ ] **Step 3: Extend the host/webview contract tests**

Add these tests to `test/custom-editor-document-sync.test.js`:

```js
test('custom flow editor posts incremental sync messages for structure edits', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /type:\s*'syncState'/)
  assert.match(source, /postSyncState/)
})

test('external text refreshes still use full rerender', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  const refreshBlock = source.match(/const refreshFromDocument = async \(\) => \{[\s\S]*?\n  \}/)?.[0]
  assert.ok(refreshBlock)
  assert.match(refreshBlock, /await rerender\(/)
  assert.doesNotMatch(refreshBlock, /postSyncState\(/)
})
```

Add these tests to `test/layout-spacing-message-contract.test.js`:

```js
test('webview app listens for syncState and updates live state', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /window\.addEventListener\('message'/)
  assert.match(source, /message\?\.type === 'syncState'/)
  assert.match(source, /setDocumentModel\(message\.payload\)/)
})

test('deleteNode preserves remaining layout instead of auto-layouting', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'deleteNode' && message\.nodeId\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.doesNotMatch(block, /documentModel\.layout\s*=\s*autoLayoutCurrentGraph\(\)/)
  assert.match(block, /nodes:\s*Object\.fromEntries/)
})

test('autoLayout no longer forces fitView during incremental sync', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'autoLayout'\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.doesNotMatch(block, /fitViewRequestToken \+= 1/)
  assert.doesNotMatch(block, /fitViewOnLoad:\s*true/)
  assert.match(block, /postSyncState\(/)
})
```

- [ ] **Step 4: Run the focused tests to verify they fail**

Run:

```bash
node --test test/to-webview-sync-state.test.js test/reconcile-selected-element.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js
```

Expected:
- helper tests fail with `ERR_MODULE_NOT_FOUND`
- contract tests fail because `syncState`, selection reconciliation, and the new `deleteNode` / `autoLayout` behavior are not implemented yet

- [ ] **Step 5: Commit the red tests**

```bash
git add test/to-webview-sync-state.test.js test/reconcile-selected-element.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js
git commit -m "test: cover incremental structure sync behavior"
```

### Task 2: Introduce shared sync payload helpers and host incremental sync

**Files:**
- Create: `src/webview/toWebviewSyncState.js`
- Modify: `src/webview/buildWebviewDocumentPayload.js`
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Test: `test/to-webview-sync-state.test.js`
- Test: `test/custom-editor-document-sync.test.js`
- Test: `test/layout-spacing-message-contract.test.js`

- [ ] **Step 1: Implement the shared sync payload helper**

Create `src/webview/toWebviewSyncState.js`:

```js
export function toWebviewSyncState(documentModel, viewState = {}, options = {}) {
  return {
    sourcePath: documentModel.sourcePath,
    graph: documentModel.graph,
    layout: documentModel.layout,
    layoutSpacing: viewState.layoutSpacing ?? documentModel.layoutSpacing ?? 100,
    edgeRenderMode: viewState.edgeRenderMode ?? documentModel.edgeRenderMode ?? 'straight',
    backgroundStyle: viewState.backgroundStyle ?? documentModel.backgroundStyle ?? 'paper',
    viewport: viewState.viewport ?? documentModel.viewport ?? null,
    documentError: documentModel.documentError ?? null,
    fitViewOnLoad: options.fitViewOnLoad ?? documentModel.fitViewOnLoad ?? false,
    fitViewRequestToken: options.fitViewRequestToken ?? documentModel.fitViewRequestToken ?? 0,
  }
}
```

- [ ] **Step 2: Reuse the helper for the initial HTML boot payload**

Update `src/webview/buildWebviewDocumentPayload.js`:

```js
import { toWebviewSyncState } from './toWebviewSyncState.js'

export function buildWebviewDocumentPayload(documentModel) {
  return JSON.stringify(toWebviewSyncState(documentModel))
}
```

- [ ] **Step 3: Add `postSyncState()` in the host and keep `rerender()` only for initial/text refresh**

Add this to `src/extension-helpers/resolveCustomFlowEditor.js`:

```js
const postSyncState = async (nextModel = documentModel, options = {}) => {
  const payload = toWebviewSyncState(
    nextModel,
    {
      layoutSpacing,
      edgeRenderMode,
      backgroundStyle,
      viewport,
    },
    {
      fitViewOnLoad: options.fitViewOnLoad ?? false,
      fitViewRequestToken: options.fitViewRequestToken ?? fitViewRequestToken,
    },
  )

  await webviewPanel.webview.postMessage({
    type: 'syncState',
    payload,
  })
}
```

Also load the helper alongside the other modules:

```js
const [
  { createWebviewDocumentModel },
  { renameNodeLabel },
  ...
  { createSuccessorNode },
  { toWebviewSyncState },
] = await Promise.all([
  loadModule('./extension-helpers/createWebviewDocumentModel.js'),
  loadModule('./model/renameNodeLabel.js'),
  ...
  loadModule('./model/createSuccessorNode.js'),
  loadModule('./webview/toWebviewSyncState.js'),
])
```

Do not change these paths yet:
- initial boot after opening the editor still calls `await rerender(...)`
- `refreshFromDocument()` still calls `await rerender(...)`

- [ ] **Step 4: Route non-text structure edits through `postSyncState()`**

Replace `await rerender()` with `await postSyncState()` in these host handlers:

```js
renameNode
createNode
createSuccessorNode
deleteNode
deleteEdge
renameEdgeLabel
createEdge
autoLayout
setSpacing
setBackgroundStyle
```

Keep `setViewport` and `setEdgeRenderMode` as non-rerendering in-memory view-state updates.

- [ ] **Step 5: Run the focused tests to verify green**

Run:

```bash
node --test test/to-webview-sync-state.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js
```

Expected:
- payload helper test passes
- source-contract tests pass for `syncState` and rerender split

- [ ] **Step 6: Commit the host sync path**

```bash
git add src/webview/toWebviewSyncState.js src/webview/buildWebviewDocumentPayload.js src/extension-helpers/resolveCustomFlowEditor.js test/to-webview-sync-state.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js
git commit -m "feat: add incremental sync path for structure edits"
```

### Task 3: Update the React app to consume live sync state without remounting

**Files:**
- Create: `src/webview-app/state/reconcileSelectedElement.js`
- Modify: `src/webview-app/App.jsx`
- Test: `test/reconcile-selected-element.test.js`
- Test: `test/layout-spacing-message-contract.test.js`

- [ ] **Step 1: Implement selection reconciliation**

Create `src/webview-app/state/reconcileSelectedElement.js`:

```js
export function reconcileSelectedElement(selectedElement, nodes, edges) {
  if (!selectedElement) {
    return null
  }

  if (selectedElement.type === 'node') {
    return nodes.some((node) => node.id === selectedElement.id) ? selectedElement : null
  }

  if (selectedElement.type === 'edge') {
    const nextEdge = edges.find((edge) => edge.id === selectedElement.id)
    if (!nextEdge) {
      return null
    }

    return {
      type: 'edge',
      id: nextEdge.id,
      edgeRef: nextEdge.data.edgeRef,
    }
  }

  return null
}
```

- [ ] **Step 2: Listen for `syncState` in `App.jsx` and update live state**

Add the effect inside `AppInner()`:

```js
React.useEffect(() => {
  const handleMessage = (event) => {
    const message = event.data
    if (message?.type !== 'syncState' || !message.payload) {
      return
    }

    setDocumentModel(message.payload)
    setEdgeRenderMode(message.payload.edgeRenderMode ?? 'straight')
    setLayoutSpacing(message.payload.layoutSpacing ?? 100)
    setBackgroundStyle(message.payload.backgroundStyle ?? 'paper')
  }

  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}, [setDocumentModel])
```

Use `documentModel` instead of `initialDocument` for live props:

```jsx
const documentError = documentModel.documentError ?? null

...

<TopToolbar
  sourcePath={documentModel.sourcePath}
  edgeRenderMode={edgeRenderMode}
  layoutSpacing={layoutSpacing}
  backgroundStyle={backgroundStyle}
  ...
/>

<FlowCanvas
  ...
  initialViewport={documentModel.viewport}
  fitViewOnLoad={documentModel.fitViewOnLoad}
  fitViewRequestToken={documentModel.fitViewRequestToken}
  ...
/>
```

This requires destructuring `setDocumentModel` from `useEditorState(...)`.

- [ ] **Step 3: Clear stale selection after incremental sync**

Add the reconciliation effect:

```js
React.useEffect(() => {
  setSelectedElement((current) => reconcileSelectedElement(current, nodes, edges))
}, [edges, nodes])
```

- [ ] **Step 4: Run the focused app tests**

Run:

```bash
node --test test/reconcile-selected-element.test.js test/layout-spacing-message-contract.test.js
```

Expected:
- selection reconciliation helper tests pass
- app contract test passes for `syncState` listener and live state updates

- [ ] **Step 5: Commit the webview consumer changes**

```bash
git add src/webview-app/state/reconcileSelectedElement.js src/webview-app/App.jsx test/reconcile-selected-element.test.js test/layout-spacing-message-contract.test.js
git commit -m "feat: receive incremental graph sync in webview"
```

### Task 4: Preserve node positions on delete and remove camera jumps from auto-layout

**Files:**
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Modify: `test/layout-spacing-message-contract.test.js`
- Modify: `test/custom-editor-document-sync.test.js`
- Test: `npm test`

- [ ] **Step 1: Preserve remaining node layout when deleting a node**

Update the `deleteNode` branch in `src/extension-helpers/resolveCustomFlowEditor.js`:

```js
if (message?.type === 'deleteNode' && message.nodeId) {
  documentModel.graph = deleteNode(documentModel.graph, message.nodeId)
  documentModel.layout = {
    ...documentModel.layout,
    nodes: Object.fromEntries(
      Object.entries(documentModel.layout.nodes ?? {}).filter(([nodeId]) => nodeId !== message.nodeId),
    ),
  }

  const mode = await persistGraph()
  postHostDebug(webviewPanel, `deleteNode saved via ${mode}: ${message.nodeId}`)
  await postSyncState()
  return
}
```

This intentionally leaves holes in the layout. Do not auto-pack nearby nodes.

- [ ] **Step 2: Stop forcing camera refit during auto-layout incremental sync**

Update the `autoLayout` branch to:

```js
if (message?.type === 'autoLayout') {
  documentModel.layout = autoLayoutCurrentGraph()
  postHostDebug(webviewPanel, 'autoLayout applied')
  await postSyncState()
  return
}
```

Do not increment `fitViewRequestToken` there.
Do not pass `{ fitViewOnLoad: true }`.

Keep the initial open path unchanged:

```js
fitViewRequestToken += 1
await rerender(..., { fitViewOnLoad: true })
```

- [ ] **Step 3: Keep spacing as an explicit layout update**

Leave `setSpacing` as:

```js
layoutSpacing = normalizeLayoutSpacing(message.value)
documentModel.layout = autoLayoutCurrentGraph()
postHostDebug(webviewPanel, `setSpacing applied: ${layoutSpacing}`)
await postSyncState()
```

This keeps the spacing slider functional while normal structure edits no longer trigger implicit layout churn.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected:
- `node --test test/*.test.js` reports `# pass 36` and `# fail 0` after the new tests are added
- `npm run build` exits successfully

- [ ] **Step 5: Commit the behavior polish**

```bash
git add src/extension-helpers/resolveCustomFlowEditor.js test/layout-spacing-message-contract.test.js test/custom-editor-document-sync.test.js
git commit -m "fix: avoid flashing on structure edits"
```

## Self-Review

- Spec coverage: the plan covers incremental `syncState` for structure edits, preserves remaining node positions on delete, keeps text-refresh rerendering out of scope, removes auto-layout camera jumps, and handles stale selection after incremental updates.
- Placeholder scan: every task includes concrete file paths, code snippets, commands, and expected results.
- Type consistency: the plan consistently uses `syncState`, `toWebviewSyncState`, `postSyncState`, and `reconcileSelectedElement`; initial/text refreshes remain on `rerender()` by design.
