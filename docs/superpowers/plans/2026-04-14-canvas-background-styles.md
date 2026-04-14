# Canvas Background Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent toolbar-controlled canvas background style selector with `paper`, `obsidian`, and `gradient` modes while preserving light/dark theme behavior.

**Architecture:** Treat `backgroundStyle` as view-only state, parallel to `layoutSpacing`, `edgeRenderMode`, and `viewport`. Persist the chosen style per `.flow` file in the extension host via `workspaceState`, inject it into the webview payload, let the toolbar update local state immediately, and apply the visual variant through CSS classes on the flow canvas.

**Tech Stack:** VS Code extension host, React 19, `@xyflow/react`, Node `node:test`, esbuild

---

## File Map

- Modify: `src/extension.cjs`
  - Read and persist `backgroundStyle` in host view state
  - Inject the chosen style into the webview document model
  - Handle `setBackgroundStyle` messages without mutating graph data
- Modify: `src/webview/buildWebviewDocumentPayload.js`
  - Serialize `backgroundStyle` into the HTML bootstrap payload
- Modify: `src/webview-app/App.jsx`
  - Hold `backgroundStyle` in local UI state
  - Pass the value to `TopToolbar` and `FlowCanvas`
  - Post `setBackgroundStyle` messages immediately on change
- Modify: `src/webview-app/components/TopToolbar.jsx`
  - Add the background style `select`
- Modify: `src/webview-app/components/FlowCanvas.jsx`
  - Add background-style class hooks on the canvas wrapper
  - Keep the XYFlow `Background` dot layer available for style variants
- Modify: `src/webview-app/index.css`
  - Define `paper`, `obsidian`, and `gradient` canvas styles for light/dark themes
  - Make `obsidian` the warm dark dotted recreation and keep the existing gradient look as its own mode
- Modify: `test/render-graph-html.test.js`
  - Cover payload serialization of `backgroundStyle`
- Modify: `test/top-toolbar-edge-mode.test.js`
  - Cover toolbar background style selector presence and options
- Modify: `test/flow-canvas-read-mode.test.js`
  - Cover FlowCanvas background-style hook
- Modify: `test/layout-spacing-message-contract.test.js`
  - Cover webview state initialization and message posting for `backgroundStyle`
- Create: `test/background-style-message-contract.test.js`
  - Cover host-side `backgroundStyle` storage and no graph persistence side effects

---

### Task 1: Host-Side Background Style View State

**Files:**
- Modify: `src/extension.cjs`
- Modify: `src/webview/buildWebviewDocumentPayload.js`
- Modify: `test/render-graph-html.test.js`
- Create: `test/background-style-message-contract.test.js`

- [ ] **Step 1: Write the failing payload test**

Add this test to `test/render-graph-html.test.js`:

```js
test('preserves background style in the webview payload', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    backgroundStyle: 'obsidian',
  })

  assert.match(html, /"backgroundStyle":"obsidian"/)
})
```

- [ ] **Step 2: Write the failing host contract test**

Create `test/background-style-message-contract.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('extension tracks background style as host view state', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')

  assert.match(source, /backgroundStyle/)
  assert.match(source, /message\?\.type === 'setBackgroundStyle'/)
  assert.match(source, /workspaceState/)
})

test('background style updates do not persist graph data', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')
  const block = source.match(/if \(message\?\.type === 'setBackgroundStyle'\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.doesNotMatch(block, /persistGraph\(\)/)
  assert.doesNotMatch(block, /documentModel\.graph\s*=/)
})
```

- [ ] **Step 3: Run the focused failing tests**

Run:

```bash
node --test test/render-graph-html.test.js test/background-style-message-contract.test.js
```

Expected:

```text
not ok ... preserves background style in the webview payload
not ok ... extension tracks background style as host view state
```

- [ ] **Step 4: Implement minimal payload support**

Update `src/webview/buildWebviewDocumentPayload.js` to include the new field:

```js
export function buildWebviewDocumentPayload(documentModel) {
  return JSON.stringify({
    sourcePath: documentModel.sourcePath,
    graph: documentModel.graph,
    layout: documentModel.layout,
    layoutSpacing: documentModel.layoutSpacing,
    edgeRenderMode: documentModel.edgeRenderMode,
    backgroundStyle: documentModel.backgroundStyle,
    viewport: documentModel.viewport,
    fitViewOnLoad: documentModel.fitViewOnLoad,
    fitViewRequestToken: documentModel.fitViewRequestToken,
  })
}
```

- [ ] **Step 5: Implement host-side state read/write**

In `src/extension.cjs`, add:

```js
const DEFAULT_BACKGROUND_STYLE = 'paper'

function toBackgroundStyleStorageKey(sourcePath) {
  return `diagramEditor.backgroundStyle:${sourcePath}`
}

function normalizeBackgroundStyle(value) {
  return value === 'obsidian' || value === 'gradient' ? value : 'paper'
}
```

Inside `openPreview()` initialize:

```js
let backgroundStyle = normalizeBackgroundStyle(
  extensionContext.workspaceState.get(toBackgroundStyleStorageKey(sourcePath)),
)
```

When building the webview document model include:

```js
backgroundStyle,
```

Handle the message without touching graph state:

```js
if (message?.type === 'setBackgroundStyle') {
  backgroundStyle = normalizeBackgroundStyle(message.value)
  await extensionContext.workspaceState.update(
    toBackgroundStyleStorageKey(documentModel.sourcePath),
    backgroundStyle,
  )
  postHostDebug(panel, `setBackgroundStyle applied: ${backgroundStyle}`)
  await rerender()
  return
}
```

- [ ] **Step 6: Run the focused tests again**

Run:

```bash
node --test test/render-graph-html.test.js test/background-style-message-contract.test.js
```

Expected:

```text
# pass 6
# fail 0
```

- [ ] **Step 7: Commit host-side state support**

Run:

```bash
git add src/extension.cjs src/webview/buildWebviewDocumentPayload.js test/render-graph-html.test.js test/background-style-message-contract.test.js
git commit -m "feat: persist canvas background style in host state"
```

---

### Task 2: Toolbar Selector and Webview State Wiring

**Files:**
- Modify: `src/webview-app/App.jsx`
- Modify: `src/webview-app/components/TopToolbar.jsx`
- Modify: `test/top-toolbar-edge-mode.test.js`
- Modify: `test/layout-spacing-message-contract.test.js`

- [ ] **Step 1: Write the failing toolbar selector test**

Add this test to `test/top-toolbar-edge-mode.test.js`:

```js
test('top toolbar exposes canvas background style choices', async () => {
  const source = await readFile('src/webview-app/components/TopToolbar.jsx', 'utf8')

  assert.match(source, /backgroundStyle/)
  assert.match(source, /onBackgroundStyleChange/)
  assert.match(source, /背景/)
  assert.match(source, /value="paper"/)
  assert.match(source, /纸面/)
  assert.match(source, /value="obsidian"/)
  assert.match(source, /点阵/)
  assert.match(source, /value="gradient"/)
  assert.match(source, /渐变/)
})
```

- [ ] **Step 2: Write the failing app state contract test**

Add this test to `test/layout-spacing-message-contract.test.js`:

```js
test('webview app preserves background style and posts updates to host', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /initialDocument\.backgroundStyle/)
  assert.match(source, /setBackgroundStyle/)
  assert.match(source, /type: 'setBackgroundStyle'/)
})
```

- [ ] **Step 3: Run the focused failing tests**

Run:

```bash
node --test test/top-toolbar-edge-mode.test.js test/layout-spacing-message-contract.test.js
```

Expected:

```text
not ok ... top toolbar exposes canvas background style choices
not ok ... webview app preserves background style and posts updates to host
```

- [ ] **Step 4: Implement toolbar selector props**

Update the `TopToolbar` signature in `src/webview-app/components/TopToolbar.jsx`:

```jsx
export function TopToolbar({
  sourcePath,
  edgeRenderMode,
  layoutSpacing,
  backgroundStyle,
  onCreateNode,
  onAutoLayout,
  onEdgeRenderModeChange,
  onLayoutSpacingChange,
  onBackgroundStyleChange,
}) {
```

Add the selector in `.toolbar-actions`:

```jsx
<label className="toolbar-select">
  <span>背景</span>
  <select
    value={backgroundStyle}
    onChange={(event) => onBackgroundStyleChange(event.target.value)}
    aria-label="背景样式"
  >
    <option value="paper">纸面</option>
    <option value="obsidian">点阵</option>
    <option value="gradient">渐变</option>
  </select>
</label>
```

- [ ] **Step 5: Implement app state and message posting**

In `src/webview-app/App.jsx`, initialize:

```js
const [backgroundStyle, setBackgroundStyle] = React.useState(initialDocument.backgroundStyle ?? 'paper')
```

Add the change handler:

```js
const handleBackgroundStyleChange = React.useCallback((nextBackgroundStyle) => {
  setBackgroundStyle(nextBackgroundStyle)
  postToHost({
    type: 'setBackgroundStyle',
    value: nextBackgroundStyle,
  })
}, [])
```

Pass the state through:

```jsx
<TopToolbar
  sourcePath={documentModel.sourcePath}
  edgeRenderMode={edgeRenderMode}
  layoutSpacing={layoutSpacing}
  backgroundStyle={backgroundStyle}
  onCreateNode={handleCreateNode}
  onAutoLayout={handleAutoLayout}
  onEdgeRenderModeChange={handleEdgeRenderModeChange}
  onLayoutSpacingChange={handleLayoutSpacingChange}
  onBackgroundStyleChange={handleBackgroundStyleChange}
/>
```

- [ ] **Step 6: Run the focused tests again**

Run:

```bash
node --test test/top-toolbar-edge-mode.test.js test/layout-spacing-message-contract.test.js
```

Expected:

```text
# pass 10
# fail 0
```

- [ ] **Step 7: Commit toolbar and app state wiring**

Run:

```bash
git add src/webview-app/App.jsx src/webview-app/components/TopToolbar.jsx test/top-toolbar-edge-mode.test.js test/layout-spacing-message-contract.test.js
git commit -m "feat: add canvas background style selector"
```

---

### Task 3: FlowCanvas Hook and Background Style CSS

**Files:**
- Modify: `src/webview-app/components/FlowCanvas.jsx`
- Modify: `src/webview-app/index.css`
- Modify: `test/flow-canvas-read-mode.test.js`

- [ ] **Step 1: Write the failing FlowCanvas contract test**

Add this test to `test/flow-canvas-read-mode.test.js`:

```js
test('flow canvas exposes background style class hooks', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /backgroundStyle/)
  assert.match(source, /flow-canvas--paper/)
  assert.match(source, /flow-canvas--obsidian/)
  assert.match(source, /flow-canvas--gradient/)
})
```

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
node --test test/flow-canvas-read-mode.test.js
```

Expected:

```text
not ok ... flow canvas exposes background style class hooks
```

- [ ] **Step 3: Implement canvas class hook**

Update `src/webview-app/components/FlowCanvas.jsx`:

```jsx
export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStop,
  nodeTypes,
  edgeTypes,
  isSpacingPreviewActive,
  backgroundStyle = 'paper',
  initialViewport,
  fitViewOnLoad,
  fitViewRequestToken,
  onViewportChange,
}) {
```

Build the wrapper class with the style variant:

```jsx
const canvasClassName = [
  'flow-canvas',
  `flow-canvas--${backgroundStyle}`,
  isSpacingPreviewActive ? 'flow-canvas--spacing-preview' : '',
].filter(Boolean).join(' ')
```

Use it on the wrapper:

```jsx
<div className={canvasClassName}>
```

Pass the prop from `App.jsx`:

```jsx
<FlowCanvas
  ...
  backgroundStyle={backgroundStyle}
  ...
/>
```

- [ ] **Step 4: Implement CSS variants**

Refactor `src/webview-app/index.css` so the canvas reads its palette from style-specific variables:

```css
.flow-canvas {
  --canvas-base: #f5f2e9;
  --canvas-glow: transparent;
  --canvas-sheen: transparent;
  --canvas-dot: transparent;
  --canvas-grid-opacity: 0;
  position: relative;
  min-height: calc(100vh - 73px);
  background:
    radial-gradient(circle at top left, var(--canvas-glow), transparent 34%),
    linear-gradient(180deg, var(--canvas-sheen), transparent 28%),
    var(--canvas-base);
}

.flow-canvas--paper {
  --canvas-base: #f5f2e9;
  --canvas-glow: rgba(255, 253, 246, 0.35);
  --canvas-sheen: rgba(255, 255, 255, 0.12);
  --canvas-dot: rgba(121, 112, 88, 0.04);
  --canvas-grid-opacity: 0.18;
}

.flow-canvas--gradient {
  --canvas-base: #1a1c1e;
  --canvas-glow: rgba(68, 74, 44, 0.18);
  --canvas-sheen: rgba(255, 245, 214, 0.03);
  --canvas-dot: rgba(210, 203, 184, 0.14);
  --canvas-grid-opacity: 0.38;
}

.flow-canvas--obsidian {
  --canvas-base: #202224;
  --canvas-glow: rgba(103, 92, 63, 0.08);
  --canvas-sheen: rgba(255, 248, 223, 0.02);
  --canvas-dot: rgba(214, 208, 192, 0.2);
  --canvas-grid-opacity: 0.92;
}

body.vscode-dark .flow-canvas--obsidian,
body.vscode-high-contrast .flow-canvas--obsidian {
  --canvas-base: #1e2022;
  --canvas-glow: rgba(100, 89, 58, 0.1);
  --canvas-sheen: rgba(255, 244, 216, 0.02);
  --canvas-dot: rgba(216, 210, 194, 0.22);
  --canvas-grid-opacity: 0.94;
}

.flow-background {
  opacity: var(--canvas-grid-opacity);
}

.flow-background circle {
  fill: var(--canvas-dot);
}
```

Also keep the current warm gradient look under `flow-canvas--gradient` rather than in the global default canvas style.

- [ ] **Step 5: Run the focused test again**

Run:

```bash
node --test test/flow-canvas-read-mode.test.js
```

Expected:

```text
# pass 5
# fail 0
```

- [ ] **Step 6: Build the webview bundle**

Run:

```bash
npm run build
```

Expected:

```text
> diagram-editor-mvp@0.0.1 build
> npm run build:webview
```

- [ ] **Step 7: Commit canvas styling support**

Run:

```bash
git add src/webview-app/App.jsx src/webview-app/components/FlowCanvas.jsx src/webview-app/index.css test/flow-canvas-read-mode.test.js
git commit -m "feat: add canvas background style variants"
```

---

### Task 4: Full Verification and Cleanup

**Files:**
- Verify: `src/extension.cjs`
- Verify: `src/webview/buildWebviewDocumentPayload.js`
- Verify: `src/webview-app/App.jsx`
- Verify: `src/webview-app/components/TopToolbar.jsx`
- Verify: `src/webview-app/components/FlowCanvas.jsx`
- Verify: `src/webview-app/index.css`
- Verify: `test/render-graph-html.test.js`
- Verify: `test/top-toolbar-edge-mode.test.js`
- Verify: `test/flow-canvas-read-mode.test.js`
- Verify: `test/layout-spacing-message-contract.test.js`
- Verify: `test/background-style-message-contract.test.js`

- [ ] **Step 1: Run the full automated test suite**

Run:

```bash
npm test
```

Expected:

```text
# pass 27
# fail 0
```

- [ ] **Step 2: Rebuild the webview bundle**

Run:

```bash
npm run build
```

Expected:

```text
esbuild.webview.mjs
```

- [ ] **Step 3: Manual verification in VS Code Extension Host**

Run this flow manually:

```text
1. Press F5 in VS Code to launch the Extension Host
2. Open example.flow
3. Run "Diagram Editor: Open Preview"
4. Switch 背景 among 纸面 / 点阵 / 渐变
5. Close preview and reopen the same file
6. Confirm the chosen background style is preserved
7. Toggle VS Code light/dark theme and confirm all three styles still render correctly
```

Expected:

```text
- 纸面 stays calm and mostly plain
- 点阵 shows a warm dark dotted canvas close to the reference
- 渐变 preserves the current atmospheric background
- Reopen restores the last chosen style for the same .flow file
```

- [ ] **Step 4: Final commit**

Run:

```bash
git add src/extension.cjs src/webview/buildWebviewDocumentPayload.js src/webview-app/App.jsx src/webview-app/components/TopToolbar.jsx src/webview-app/components/FlowCanvas.jsx src/webview-app/index.css test/render-graph-html.test.js test/top-toolbar-edge-mode.test.js test/flow-canvas-read-mode.test.js test/layout-spacing-message-contract.test.js test/background-style-message-contract.test.js
git commit -m "feat: add persistent canvas background styles"
```

---

## Self-Review

### Spec coverage

- Toolbar selector: covered in Task 2
- Persistent per-file state: covered in Task 1
- Three background styles: covered in Task 3
- Preserve light/dark themes: covered in Task 3 manual and CSS steps
- Keep gradient as third style: covered in Task 3 CSS steps
- Tests and build verification: covered in Tasks 1-4

No uncovered spec requirements remain.

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” placeholders remain
- All code-changing steps include concrete code snippets
- All verification steps include exact commands and expected outcomes

### Type consistency

- `backgroundStyle` is used consistently across host payload, app state, toolbar props, FlowCanvas props, CSS hooks, and tests
- Allowed values remain `paper | obsidian | gradient` throughout the plan
