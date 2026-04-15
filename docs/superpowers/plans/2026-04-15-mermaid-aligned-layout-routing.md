# Mermaid-Aligned Layout and Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `.flow` diagrams read closer to Mermaid by using one plain edge model, removing enhanced feedback routing, and tightening the Dagre layout defaults.

**Architecture:** Keep the current `.flow` parser, graph model, Dagre layout, and XYFlow canvas. Simplify the renderer instead of adding a new router: all edges map to one normal edge type, host/webview state no longer tracks edge render mode, and layout regains control over readability. Preserve existing editing features and message flow where they are not directly tied to the old edge-mode toggle or feedback-edge special casing.

**Tech Stack:** VS Code extension API, React, `@xyflow/react`, dagre, Node.js test runner

---

## File Map

- `src/extension-helpers/resolveCustomFlowEditor.js`
  Remove `edgeRenderMode` view state and the `setEdgeRenderMode` message branch.
- `src/webview/toWebviewSyncState.js`
  Stop serializing `edgeRenderMode`.
- `src/webview/renderGraphHtml.js`
  Keep payload injection behavior, but tests will stop expecting `edgeRenderMode` in the serialized HTML.
- `src/webview-app/App.jsx`
  Remove `edgeRenderMode` local state, its host sync, and the `feedbackEdge` registration.
- `src/webview-app/state/useEditorState.jsx`
  Stop threading `edgeRenderMode` into edge mapping.
- `src/webview-app/components/FloatingCanvasControls.jsx`
  Remove the edge-style controls and label from the display menu.
- `src/webview-app/mapping/toFlowEdges.js`
  Collapse to a single edge mapping strategy with no feedback lanes and no converging target offsets.
- `src/webview-app/components/edges/NormalReadEdge.jsx`
  Simplify to a single path calculation with no `readRoute` payload contract.
- `src/webview-app/components/edges/normalReadEdgePath.js`
  Reduce to one plain geometry helper.
- `src/webview-app/components/edges/FeedbackEdge.jsx`
  Delete.
- `src/webview-app/components/edges/feedbackEdgePath.js`
  Delete.
- `src/model/layout.js`
  Retune Dagre defaults for a tighter, more Mermaid-like footprint.
- `test/to-flow-edges.test.js`
  Replace feedback/fan-in expectations with a unified-edge contract.
- `test/normal-read-edge-path.test.js`
  Replace route-offset expectations with a plain path contract.
- `test/feedback-edge-path.test.js`
  Delete.
- `test/app-edge-types-contract.test.js`
  Update the app contract to a single custom edge renderer.
- `test/floating-canvas-controls.test.js`
  Update the floating controls contract to remove edge-mode UI.
- `test/custom-editor-document-sync.test.js`
  Update the host state contract to remove `edgeRenderMode` while preserving other view state.
- `test/layout-spacing-message-contract.test.js`
  Remove the edge-mode preservation assertions and replace them with negative assertions.
- `test/to-webview-sync-state.test.js`
  Remove `edgeRenderMode` from the sync payload expectation.
- `test/render-graph-html.test.js`
  Stop expecting `edgeRenderMode` in the HTML payload snapshot.
- `test/layout.test.js`
  Tighten spacing expectations around the Mermaid reference graph.

---

### Task 1: Remove edge-mode state and UI

**Files:**
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Modify: `src/webview/toWebviewSyncState.js`
- Modify: `src/webview-app/App.jsx`
- Modify: `src/webview-app/state/useEditorState.jsx`
- Modify: `src/webview-app/components/FloatingCanvasControls.jsx`
- Modify: `test/floating-canvas-controls.test.js`
- Modify: `test/custom-editor-document-sync.test.js`
- Modify: `test/layout-spacing-message-contract.test.js`
- Modify: `test/to-webview-sync-state.test.js`
- Modify: `test/render-graph-html.test.js`

- [ ] **Step 1: Write the failing tests**

Update `test/floating-canvas-controls.test.js` first test to:

```js
test('floating canvas controls keep display controls focused on background only', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.doesNotMatch(source, /edgeRenderMode/)
  assert.doesNotMatch(source, /onEdgeRenderModeChange/)
  assert.match(source, /Display/)
  assert.doesNotMatch(source, /直线/)
  assert.doesNotMatch(source, /曲线/)
  assert.doesNotMatch(source, /<select/)
})
```

Update `test/custom-editor-document-sync.test.js` second test to:

```js
test('custom flow editor preserves remaining view state when rerendering from text changes', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /layoutSpacing/)
  assert.doesNotMatch(source, /edgeRenderMode/)
  assert.match(source, /backgroundStyle/)
  assert.match(source, /viewport/)
})
```

Update `test/layout-spacing-message-contract.test.js` edge-mode contract to:

```js
test('host no longer tracks edge render mode as a view state', async () => {
  const extensionSource = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.doesNotMatch(extensionSource, /edgeRenderMode/)
  assert.doesNotMatch(extensionSource, /setEdgeRenderMode/)
  assert.doesNotMatch(appSource, /initialDocument\\.edgeRenderMode/)
  assert.doesNotMatch(appSource, /type: 'setEdgeRenderMode'/)
})
```

Update `test/to-webview-sync-state.test.js` payload expectation to:

```js
assert.deepEqual(payload, {
  sourcePath: '/workspace/example.flow',
  graph: { direction: 'LR', nodes: [], edges: [] },
  layout: { nodes: {} },
  layoutSpacing: 135,
  backgroundStyle: 'obsidian',
  viewport: { x: 12, y: 24, zoom: 1.2 },
  documentError: null,
  fitViewOnLoad: true,
  fitViewRequestToken: 3,
})
```

Update the input view state in the same test to remove `edgeRenderMode`.

Update `test/render-graph-html.test.js` payload assertion from:

```js
assert.match(html, /"edgeRenderMode":"default"/)
```

to:

```js
assert.doesNotMatch(html, /"edgeRenderMode":/)
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
node --test test/floating-canvas-controls.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js test/to-webview-sync-state.test.js test/render-graph-html.test.js
```

Expected: FAIL because the code still contains `edgeRenderMode` state, UI, and serialized payload fields.

- [ ] **Step 3: Remove the edge-mode state from host and webview**

In `src/webview/toWebviewSyncState.js`, change the function body to:

```js
export function toWebviewSyncState(documentModel, viewState = {}, options = {}) {
  return {
    sourcePath: documentModel.sourcePath,
    graph: documentModel.graph,
    layout: documentModel.layout,
    layoutSpacing: viewState.layoutSpacing ?? documentModel.layoutSpacing ?? 100,
    backgroundStyle: viewState.backgroundStyle ?? documentModel.backgroundStyle ?? 'paper',
    viewport: viewState.viewport ?? documentModel.viewport ?? null,
    documentError: documentModel.documentError ?? null,
    fitViewOnLoad: options.fitViewOnLoad ?? documentModel.fitViewOnLoad ?? false,
    fitViewRequestToken: options.fitViewRequestToken ?? documentModel.fitViewRequestToken ?? 0,
  }
}
```

In `src/extension-helpers/resolveCustomFlowEditor.js`, remove the `edgeRenderMode` variable and pass only the remaining view state into `createWebviewDocumentModel(...)` and `toWebviewSyncState(...)`. Delete this branch entirely:

```js
if (message?.type === 'setEdgeRenderMode') {
  edgeRenderMode = message.value === 'default' ? 'default' : 'straight'
  postHostDebug(webviewPanel, `setEdgeRenderMode applied: ${edgeRenderMode}`)
  return
}
```

In `src/webview-app/state/useEditorState.jsx`, reduce the signature to:

```js
export function useEditorState(
  initialDocument,
  layoutSpacing,
  isSpacingPreviewActive = false,
) {
  const [documentModel, setDocumentModel] = React.useState(initialDocument)
  const activeLayout = React.useMemo(
    () => toEditorLayout(documentModel, layoutSpacing, isSpacingPreviewActive),
    [documentModel, isSpacingPreviewActive, layoutSpacing],
  )

  const flowNodes = React.useMemo(
    () => toFlowNodes(documentModel.graph, activeLayout),
    [activeLayout, documentModel.graph],
  )

  const flowEdges = React.useMemo(
    () => toFlowEdges(
      documentModel.graph.edges,
      activeLayout,
      documentModel.graph.direction,
    ),
    [activeLayout, documentModel.graph.direction, documentModel.graph.edges],
  )

  return {
    documentModel,
    setDocumentModel,
    flowNodes,
    flowEdges,
  }
}
```

In `src/webview-app/components/FloatingCanvasControls.jsx`, remove `edgeRenderMode` and `onEdgeRenderModeChange` from the props, remove `edgeModeLabel`, and make the chip body:

```jsx
<button
  type="button"
  className="canvas-hud__chip"
  onClick={() => setIsDisplayMenuOpen((current) => !current)}
>
  <span className="canvas-hud__chip-label">Display</span>
  <span>{backgroundLabel}</span>
</button>
```

Also delete the entire `连线` section from the display menu.

In `src/webview-app/App.jsx`, remove:

```js
const [edgeRenderMode, setEdgeRenderMode] = React.useState(initialDocument.edgeRenderMode ?? 'straight')
```

Change the `useEditorState(...)` call to:

```js
const { documentModel, setDocumentModel, flowNodes, flowEdges } = useEditorState(
  initialDocument,
  layoutSpacing,
  isSpacingPreviewActive,
)
```

In the `syncState` message handler, remove:

```js
setEdgeRenderMode(message.payload.edgeRenderMode ?? 'straight')
```

Delete the whole `handleEdgeRenderModeChange` callback and stop passing `edgeRenderMode` / `onEdgeRenderModeChange` into `FloatingCanvasControls`.

- [ ] **Step 4: Run the focused tests again**

Run:

```bash
node --test test/floating-canvas-controls.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js test/to-webview-sync-state.test.js test/render-graph-html.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/extension-helpers/resolveCustomFlowEditor.js src/webview/toWebviewSyncState.js src/webview-app/App.jsx src/webview-app/state/useEditorState.jsx src/webview-app/components/FloatingCanvasControls.jsx test/floating-canvas-controls.test.js test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js test/to-webview-sync-state.test.js test/render-graph-html.test.js
git commit -m "refactor: remove edge render mode state"
```

---

### Task 2: Collapse all edges to one plain mapping contract

**Files:**
- Modify: `src/webview-app/mapping/toFlowEdges.js`
- Modify: `src/webview-app/App.jsx`
- Modify: `test/to-flow-edges.test.js`
- Modify: `test/app-edge-types-contract.test.js`

- [ ] **Step 1: Write the failing tests**

Replace the feedback and fan-in expectations in `test/to-flow-edges.test.js` with these tests:

```js
test('maps all graph edges to one readable XYFlow edge type', () => {
  const edges = toFlowEdges([
    { from: 'start', to: 'review', label: '通过' },
    { from: 'retry', to: 'review', label: '重试' },
  ])

  assert.deepEqual(
    edges.map((edge) => ({
      id: edge.id,
      type: edge.type,
      data: edge.data,
    })),
    [
      {
        id: 'start->review#通过',
        type: 'readEdge',
        data: { edgeRef: { from: 'start', to: 'review', label: '通过' } },
      },
      {
        id: 'retry->review#重试',
        type: 'readEdge',
        data: { edgeRef: { from: 'retry', to: 'review', label: '重试' } },
      },
    ],
  )
})

test('does not create feedback routes or target offsets for back edges', () => {
  const edges = toFlowEdges(
    [{ from: 'append_result', to: 'build_ctx', label: undefined }],
    {
      nodes: {
        build_ctx: { x: 120, y: 120, w: 132, h: 46 },
        append_result: { x: 80, y: 560, w: 132, h: 46 },
      },
    },
    'TD',
  )

  assert.equal(edges[0].type, 'readEdge')
  assert.deepEqual(edges[0].data, {
    edgeRef: {
      from: 'append_result',
      to: 'build_ctx',
      label: undefined,
    },
  })
  assert.equal(edges[0].className, undefined)
})
```

Update `test/app-edge-types-contract.test.js` to:

```js
test('app registers a single custom edge renderer for flow edges', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /NormalReadEdge/)
  assert.match(source, /readEdge: NormalReadEdge/)
  assert.doesNotMatch(source, /FeedbackEdge/)
  assert.doesNotMatch(source, /feedbackEdge:/)
})
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
node --test test/to-flow-edges.test.js test/app-edge-types-contract.test.js
```

Expected: FAIL because the current mapper still produces `feedbackEdge`, `feedbackRoute`, `readRoute`, and the app still registers `FeedbackEdge`.

- [ ] **Step 3: Simplify the edge mapper and app registration**

Replace `src/webview-app/mapping/toFlowEdges.js` with:

```js
const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 1.2,
}

const READ_EDGE_LABEL_STYLE = {
  fill: '#55555f',
  fontSize: 11,
  fontWeight: 400,
}

const READ_EDGE_MARKER = {
  type: 'arrowclosed',
  color: '#6f6f78',
}

const EDGE_STYLE_MAP = {
  dashed: { strokeDasharray: '4 4' },
  dotted: { strokeDasharray: '1 4' },
  dashdot: { strokeDasharray: '4 2 1 2' },
}

export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge) => {
    const edgeRef = {
      from: edge.from,
      to: edge.to,
      label: edge.label,
    }

    if (edge.style) {
      edgeRef.style = edge.style
    }

    const flowEdge = {
      id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'readEdge',
      markerEnd: READ_EDGE_MARKER,
      style: READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
      data: {
        edgeRef,
      },
    }

    if (edge.style && EDGE_STYLE_MAP[edge.style]) {
      flowEdge.animated = false
      flowEdge.style = { ...flowEdge.style, ...EDGE_STYLE_MAP[edge.style] }
    }

    return flowEdge
  })
}
```

In `src/webview-app/App.jsx`, reduce `edgeTypes` to:

```js
const edgeTypes = {
  readEdge: NormalReadEdge,
}
```

Delete the `FeedbackEdge` import from the same file.

- [ ] **Step 4: Run the focused tests again**

Run:

```bash
node --test test/to-flow-edges.test.js test/app-edge-types-contract.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/webview-app/mapping/toFlowEdges.js src/webview-app/App.jsx test/to-flow-edges.test.js test/app-edge-types-contract.test.js
git commit -m "refactor: unify flow edge mapping"
```

---

### Task 3: Simplify edge path rendering and delete feedback-edge code

**Files:**
- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
- Modify: `src/webview-app/components/edges/normalReadEdgePath.js`
- Delete: `src/webview-app/components/edges/FeedbackEdge.jsx`
- Delete: `src/webview-app/components/edges/feedbackEdgePath.js`
- Modify: `test/normal-read-edge-path.test.js`
- Delete: `test/feedback-edge-path.test.js`

- [ ] **Step 1: Write the failing tests**

Replace `test/normal-read-edge-path.test.js` with:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toNormalReadEdgePath } from '../src/webview-app/components/edges/normalReadEdgePath.js'

test('builds a plain straight edge geometry from source to target', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
  })

  assert.equal(geometry.path, 'M 120,180L 360,200')
  assert.deepEqual(geometry.label, { x: 240, y: 190 })
})

test('does not require route metadata for vertical edges', () => {
  const geometry = toNormalReadEdgePath({
    sourceX: 180,
    sourceY: 120,
    targetX: 200,
    targetY: 360,
  })

  assert.equal(geometry.path, 'M 180,120L 200,360')
  assert.deepEqual(geometry.label, { x: 190, y: 240 })
})
```

Delete `test/feedback-edge-path.test.js`.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
node --test test/normal-read-edge-path.test.js
```

Expected: FAIL because `NormalReadEdge` still depends on `readRoute` fields and the old helper still expects routing options.

- [ ] **Step 3: Simplify the helper and renderer, then delete the feedback-edge files**

Replace `src/webview-app/components/edges/normalReadEdgePath.js` with:

```js
import { getStraightPath } from '@xyflow/react'

export function toNormalReadEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
}) {
  const [path, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return {
    path,
    label: {
      x: Math.round(labelX),
      y: Math.round(labelY),
    },
  }
}
```

Update `src/webview-app/components/edges/NormalReadEdge.jsx` to:

```js
export function NormalReadEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgPadding,
  labelBgBorderRadius,
}) {
  const geometry = toNormalReadEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <BaseEdge
      id={id}
      path={geometry.path}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={geometry.label.x}
      labelY={geometry.label.y}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  )
}
```

Delete:

```text
src/webview-app/components/edges/FeedbackEdge.jsx
src/webview-app/components/edges/feedbackEdgePath.js
test/feedback-edge-path.test.js
```

- [ ] **Step 4: Run the focused tests again**

Run:

```bash
node --test test/normal-read-edge-path.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/webview-app/components/edges/NormalReadEdge.jsx src/webview-app/components/edges/normalReadEdgePath.js test/normal-read-edge-path.test.js
git rm src/webview-app/components/edges/FeedbackEdge.jsx src/webview-app/components/edges/feedbackEdgePath.js test/feedback-edge-path.test.js
git commit -m "refactor: remove feedback edge routing"
```

---

### Task 4: Retune Dagre density toward Mermaid readability

**Files:**
- Modify: `src/model/layout.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing tests**

In `test/layout.test.js`, change the default spacing expectations to:

```js
test('auto-layout keeps default spacing aligned with Mermaid-like density', () => {
  assert.deepEqual(toDagreSpacing(), { ranksep: 64, nodesep: 34 })
})
```

Change the scaling expectations to:

```js
test('auto-layout scales dagre spacing from a percentage option', () => {
  assert.deepEqual(toDagreSpacing({ spacing: 150 }), { ranksep: 96, nodesep: 51 })
})
```

Change the clamp expectations to:

```js
test('auto-layout clamps invalid spacing options', () => {
  assert.deepEqual(toDagreSpacing({ spacing: 10 }), { ranksep: 19, nodesep: 10 })
  assert.deepEqual(toDagreSpacing({ spacing: 220 }), { ranksep: 96, nodesep: 51 })
  assert.deepEqual(toDagreSpacing({ spacing: 'wide' }), { ranksep: 64, nodesep: 34 })
})
```

Tighten the complex-runtime footprint test to:

```js
assert.ok(maxX - minX <= 1900)
assert.ok(maxY - minY <= 2700)
assert.ok(maxY > minY)
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
node --test test/layout.test.js
```

Expected: FAIL because the current layout constants are still `74/46/48` and the reference graph remains too loose.

- [ ] **Step 3: Tighten the Dagre defaults**

In `src/model/layout.js`, change the constants to:

```js
const DAGRE_RANK_SEP = 64
const DAGRE_NODE_SEP = 34
const DAGRE_MARGIN = 32
const MIN_DAGRE_SPACING = 30
const MAX_DAGRE_SPACING = 150
const DEFAULT_DAGRE_SPACING = 100
```

Keep `toDagreEdgePriority(...)` exactly as-is. The intent is to preserve the current forward-edge weighting while removing the routing logic that was competing with it.

- [ ] **Step 4: Run the focused tests again**

Run:

```bash
node --test test/layout.test.js
```

Expected: PASS. If the complex-runtime footprint still misses the target, reduce only `DAGRE_MARGIN` first, then `DAGRE_NODE_SEP`, and update the asserted numbers in the same file to the measured passing values before moving on.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/model/layout.js test/layout.test.js
git commit -m "style: tighten dagre readability defaults"
```

---

### Task 5: Full verification and cleanup

**Files:**
- Modify: `test/app-edge-types-contract.test.js`
- Verify: `src/webview-app/components/edges/`
- Verify: `dist/webview/` via build output only

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Rebuild the webview bundle**

Run:

```bash
npm run build
```

Expected: PASS and `dist/webview/` updates only as generated output.

- [ ] **Step 3: Sanity-check the edge renderer directory**

Run:

```bash
rg --files src/webview-app/components/edges
```

Expected output contains:

```text
src/webview-app/components/edges/NormalReadEdge.jsx
src/webview-app/components/edges/normalReadEdgePath.js
```

Expected output does not contain `FeedbackEdge.jsx` or `feedbackEdgePath.js`.

- [ ] **Step 4: Commit the finished implementation**

```bash
git add src test dist
git commit -m "style: align diagram readability with mermaid"
```

