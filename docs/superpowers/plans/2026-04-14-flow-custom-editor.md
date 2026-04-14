# Flow Custom Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the command-driven `.flow` preview with a default VS Code Custom Text Editor that opens directly in the main editor area, syncs from file changes, preserves view state, and survives invalid DSL edits.

**Architecture:** Register a `.flow` `CustomTextEditorProvider` in `package.json` and `src/extension.cjs`, then move the current panel setup into a document-driven helper that works from `TextDocument` and `WebviewPanel` instead of `activeTextEditor`. Keep `.flow` text as the single source of truth, rerender on document changes with preserved view state, and surface parse errors to the webview while keeping the last valid graph payload.

**Tech Stack:** VS Code extension API, CommonJS extension entry, ESM helpers, React 19, `@xyflow/react`, Node `node:test`, esbuild

---

## File Map

- Modify: `package.json`
  - Remove the old preview command contribution
  - Add the `.flow` custom editor declaration and activation event
- Modify: `src/extension.cjs`
  - Replace command registration with `registerCustomTextEditorProvider`
  - Delegate actual editor setup to a helper
- Create: `src/extension-helpers/resolveCustomFlowEditor.js`
  - Own the Custom Editor session lifecycle for one `TextDocument` + `WebviewPanel`
  - Reuse the existing graph editing message handlers
  - Listen for text document changes and rerender with preserved view state
- Modify: `src/workspace/loadDiagramDocument.js`
  - Add a text-based loader so Custom Editor sessions can parse `document.getText()` without file I/O
- Modify: `src/webview/buildWebviewDocumentPayload.js`
  - Serialize `documentError` into the boot payload
- Modify: `src/webview/renderGraphHtml.js`
  - Keep boot shell behavior but allow error payloads to pass through
- Modify: `src/webview-app/App.jsx`
  - Render a document error banner while keeping the last valid graph
- Modify: `src/webview-app/index.css`
  - Style the document error banner
- Create: `test/custom-editor-package-contract.test.js`
  - Verify package contribution shape and old command removal
- Create: `test/custom-editor-registration.test.js`
  - Verify host registration uses `registerCustomTextEditorProvider`
- Create: `test/custom-editor-document-sync.test.js`
  - Verify document-driven sync and view-state preservation contract
- Create: `test/document-error-banner.test.js`
  - Verify webview app surfaces parser errors without removing the graph shell
- Modify: `test/load-diagram-document.test.js`
  - Cover the new text-based loader
- Modify: `test/render-graph-html.test.js`
  - Cover error payload injection

---

### Task 1: Register `.flow` as a Custom Editor

**Files:**
- Modify: `package.json`
- Modify: `src/extension.cjs`
- Create: `test/custom-editor-package-contract.test.js`
- Create: `test/custom-editor-registration.test.js`

- [ ] **Step 1: Write the failing package contract test**

Create `test/custom-editor-package-contract.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('package registers a default custom editor for .flow files', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.deepEqual(pkg.activationEvents, ['onCustomEditor:diagramEditor.flowEditor'])
  assert.ok(Array.isArray(pkg.contributes.customEditors))
  assert.deepEqual(pkg.contributes.customEditors, [
    {
      viewType: 'diagramEditor.flowEditor',
      displayName: 'Flow Diagram Editor',
      selector: [{ filenamePattern: '*.flow' }],
      priority: 'default',
    },
  ])
})

test('package no longer contributes the command-driven preview entrypoint', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(pkg.contributes.commands, undefined)
})
```

- [ ] **Step 2: Write the failing host registration test**

Create `test/custom-editor-registration.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('extension registers the .flow custom text editor provider', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')

  assert.match(source, /registerCustomTextEditorProvider/)
  assert.match(source, /diagramEditor\.flowEditor/)
  assert.match(source, /resolveCustomTextEditor/)
})

test('extension no longer registers the preview command entrypoint', async () => {
  const source = await readFile('src/extension.cjs', 'utf8')

  assert.doesNotMatch(source, /registerCommand/)
  assert.doesNotMatch(source, /openPreview/)
})
```

- [ ] **Step 3: Run the focused failing tests**

Run:

```bash
node --test test/custom-editor-package-contract.test.js test/custom-editor-registration.test.js
```

Expected:

```text
not ok ... package registers a default custom editor for .flow files
not ok ... extension registers the .flow custom text editor provider
```

- [ ] **Step 4: Update `package.json` for Custom Editor activation**

Replace the command-based contribution with:

```json
{
  "activationEvents": [
    "onCustomEditor:diagramEditor.flowEditor"
  ],
  "contributes": {
    "customEditors": [
      {
        "viewType": "diagramEditor.flowEditor",
        "displayName": "Flow Diagram Editor",
        "selector": [
          {
            "filenamePattern": "*.flow"
          }
        ],
        "priority": "default"
      }
    ]
  }
}
```

- [ ] **Step 5: Update `src/extension.cjs` registration**

Replace the current `activate()` body with:

```js
async function resolveCustomTextEditor(document, webviewPanel) {
  const { resolveCustomFlowEditor } = await loadModule('./extension-helpers/resolveCustomFlowEditor.js')
  return resolveCustomFlowEditor({
    document,
    webviewPanel,
    extensionContext,
    outputChannel,
    loadModule,
    normalizeBackgroundStyle,
    toBackgroundStyleStorageKey,
  })
}

function activate(context) {
  extensionContext = context
  const providerRegistration = vscode.window.registerCustomTextEditorProvider(
    'diagramEditor.flowEditor',
    { resolveCustomTextEditor },
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  )
  context.subscriptions.push(providerRegistration)
}
```

Also delete the old `openPreview()` function and any `registerCommand(...)` usage.

- [ ] **Step 6: Run the focused tests again**

Run:

```bash
node --test test/custom-editor-package-contract.test.js test/custom-editor-registration.test.js
```

Expected:

```text
# fail 0
```

- [ ] **Step 7: Commit the registration migration**

Run:

```bash
git add package.json src/extension.cjs test/custom-editor-package-contract.test.js test/custom-editor-registration.test.js
git commit -m "feat: register .flow as a custom editor"
```

---

### Task 2: Move Host Setup to a Document-Driven Custom Editor Session

**Files:**
- Create: `src/extension-helpers/resolveCustomFlowEditor.js`
- Modify: `src/workspace/loadDiagramDocument.js`
- Modify: `src/extension.cjs`
- Modify: `test/load-diagram-document.test.js`

- [ ] **Step 1: Write the failing text-loader test**

Add this test to `test/load-diagram-document.test.js`:

```js
test('loads a diagram document directly from source text', async () => {
  const { loadDiagramDocumentFromSource } = await import('../src/workspace/loadDiagramDocument.js')

  const model = await loadDiagramDocumentFromSource(
    '/workspace/example.flow',
    'dir LR\\nnode start "开始"\\n',
  )

  assert.equal(model.sourcePath, '/workspace/example.flow')
  assert.equal(model.sourceText, 'dir LR\\nnode start "开始"\\n')
  assert.equal(model.graph.nodes.length, 1)
  assert.ok(model.layout.nodes.start)
})
```

- [ ] **Step 2: Run the focused failing loader test**

Run:

```bash
node --test test/load-diagram-document.test.js
```

Expected:

```text
not ok ... loads a diagram document directly from source text
```

- [ ] **Step 3: Add a text-based document loader**

Update `src/workspace/loadDiagramDocument.js`:

```js
import { autoLayoutGraph } from '../model/layout.js'
import { parseDiagram } from '../model/parseDiagram.js'

export async function loadDiagramDocumentFromSource(sourcePath, sourceText) {
  const graph = parseDiagram(sourceText)
  const layout = autoLayoutGraph(graph)

  return {
    sourcePath,
    sourceText,
    graph,
    layout,
  }
}

export async function loadDiagramDocument(fsLike, sourcePath) {
  const sourceText = await fsLike.readFile(sourcePath)
  return loadDiagramDocumentFromSource(sourcePath, sourceText)
}
```

- [ ] **Step 4: Create the Custom Editor session helper**

Create `src/extension-helpers/resolveCustomFlowEditor.js` with this skeleton:

```js
import vscode from 'vscode'

function createTextDocumentFsLike(document) {
  return {
    async readFile() {
      return document.getText()
    },
  }
}

export async function resolveCustomFlowEditor({
  document,
  webviewPanel,
  extensionContext,
  outputChannel,
  loadModule,
  normalizeBackgroundStyle,
  toBackgroundStyleStorageKey,
}) {
  webviewPanel.webview.options = {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', 'webview')],
  }

  const [
    { createWebviewDocumentModel },
    { renameNodeLabel },
    { serializeDiagram },
    { loadDiagramDocumentFromSource },
    { renderGraphHtml },
    { saveDiagramSource },
    { autoLayoutGraph },
    { createNode },
    { createEdge },
    { generateNodeId },
    { deleteNode },
    { deleteEdge },
    { renameEdgeLabel },
    { createSuccessorNode },
  ] = await Promise.all([
    loadModule('./extension-helpers/createWebviewDocumentModel.js'),
    loadModule('./model/renameNodeLabel.js'),
    loadModule('./model/serializeDiagram.js'),
    loadModule('./workspace/loadDiagramDocument.js'),
    loadModule('./webview/renderGraphHtml.js'),
    loadModule('./workspace/saveDiagramSource.js'),
    loadModule('./model/layout.js'),
    loadModule('./model/createNode.js'),
    loadModule('./model/createEdge.js'),
    loadModule('./model/generateNodeId.js'),
    loadModule('./model/deleteNode.js'),
    loadModule('./model/deleteEdge.js'),
    loadModule('./model/renameEdgeLabel.js'),
    loadModule('./model/createSuccessorNode.js'),
  ])

  const fsLike = createTextDocumentFsLike(document)
  let documentModel = await loadDiagramDocumentFromSource(document.uri.fsPath, document.getText())
  let layoutSpacing = 100
  let edgeRenderMode = 'straight'
  let backgroundStyle = normalizeBackgroundStyle(
    extensionContext.workspaceState.get(toBackgroundStyleStorageKey(document.uri.fsPath)),
  )
  let viewport = null
  let fitViewRequestToken = 0

  const rerender = async (nextModel = documentModel, options = {}) => {
    webviewPanel.webview.html = renderGraphHtml(
      createWebviewDocumentModel(
        webviewPanel.webview,
        {
          ...nextModel,
          layoutSpacing,
          edgeRenderMode,
          backgroundStyle,
          viewport,
          fitViewOnLoad: options.fitViewOnLoad ?? false,
          fitViewRequestToken,
        },
        extensionContext.extensionUri,
        vscode.Uri.joinPath,
      ),
    )
  }

  const persistGraph = async () => {
    documentModel.sourceText = serializeDiagram(documentModel.graph)
    return saveDiagramSource(fsLike, document.uri.fsPath, documentModel.sourceText)
  }

  await rerender(documentModel, { fitViewOnLoad: true })

  // Keep the current message handlers from extension.cjs here.
}
```

- [ ] **Step 5: Point `src/extension.cjs` at the new helper**

Keep the `resolveCustomTextEditor` function from Task 1 and remove any remaining direct graph-session setup from `src/extension.cjs` so it only owns:

```js
function loadModule(relativePath) {
  return import(pathToFileURL(path.join(__dirname, relativePath)).href)
}

function activate(context) {
  extensionContext = context
  const providerRegistration = vscode.window.registerCustomTextEditorProvider(
    'diagramEditor.flowEditor',
    { resolveCustomTextEditor },
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  )
  context.subscriptions.push(providerRegistration)
}
```

- [ ] **Step 6: Run the focused tests again**

Run:

```bash
node --test test/load-diagram-document.test.js test/custom-editor-registration.test.js
```

Expected:

```text
# fail 0
```

- [ ] **Step 7: Commit the document-driven session scaffold**

Run:

```bash
git add src/extension.cjs src/extension-helpers/resolveCustomFlowEditor.js src/workspace/loadDiagramDocument.js test/load-diagram-document.test.js
git commit -m "refactor: move flow editor setup to a custom editor session"
```

---

### Task 3: Sync Text Changes Back Into the Custom Editor While Preserving View State

**Files:**
- Create: `test/custom-editor-document-sync.test.js`
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Modify: `src/extension.cjs`

- [ ] **Step 1: Write the failing sync contract test**

Create `test/custom-editor-document-sync.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('custom flow editor listens for text document changes', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /onDidChangeTextDocument/)
  assert.match(source, /event\.document\.uri\.toString\(\) === document\.uri\.toString\(\)/)
  assert.match(source, /setTimeout/)
})

test('custom flow editor preserves view state when rerendering from text changes', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /layoutSpacing/)
  assert.match(source, /edgeRenderMode/)
  assert.match(source, /backgroundStyle/)
  assert.match(source, /viewport/)
})

test('custom flow editor no longer relies on active text editor lookup', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.doesNotMatch(source, /activeTextEditor/)
  assert.doesNotMatch(source, /createWebviewPanel/)
})
```

- [ ] **Step 2: Run the focused failing sync test**

Run:

```bash
node --test test/custom-editor-document-sync.test.js
```

Expected:

```text
not ok ... custom flow editor listens for text document changes
```

- [ ] **Step 3: Add document change handling with debounce**

In `src/extension-helpers/resolveCustomFlowEditor.js`, add:

```js
let refreshTimer = null
let isApplyingHostEdit = false

const refreshFromDocument = async () => {
  try {
    documentModel = await loadDiagramDocumentFromSource(document.uri.fsPath, document.getText())
    await rerender(documentModel)
  } catch (error) {
    outputChannel.appendLine(`[document-refresh] failed: ${error?.stack ?? error}`)
  }
}

const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
  if (event.document.uri.toString() !== document.uri.toString()) {
    return
  }
  if (isApplyingHostEdit) {
    return
  }

  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void refreshFromDocument()
  }, 120)
})

webviewPanel.onDidDispose(() => {
  clearTimeout(refreshTimer)
  documentChangeDisposable.dispose()
})
```

- [ ] **Step 4: Mark host-originated graph writes to avoid redundant refreshes**

Wrap the graph persistence path in `src/extension-helpers/resolveCustomFlowEditor.js`:

```js
const persistGraph = async () => {
  documentModel.sourceText = serializeDiagram(documentModel.graph)
  isApplyingHostEdit = true
  try {
    return await persistSourceText(
      document.uri.fsPath,
      documentModel.sourceText,
      fsLike,
      saveDiagramSource,
    )
  } finally {
    setTimeout(() => {
      isApplyingHostEdit = false
    }, 0)
  }
}
```

Copy the existing `persistSourceText(...)` helper from `src/extension.cjs` into `src/extension-helpers/resolveCustomFlowEditor.js` so the session helper can write through the open `TextDocument` first and fall back to `saveDiagramSource(...)`.

- [ ] **Step 5: Keep current message handlers but bind them to the new session**

Move the existing `onDidReceiveMessage` branches from `src/extension.cjs` into `src/extension-helpers/resolveCustomFlowEditor.js`, keeping these branches intact:

```js
renameNode
createNode
createSuccessorNode
autoLayout
setSpacing
setEdgeRenderMode
setBackgroundStyle
setViewport
deleteNode
deleteEdge
renameEdgeLabel
createEdge
```

Use `webviewPanel.webview.onDidReceiveMessage(...)` instead of `panel.webview.onDidReceiveMessage(...)`, and keep view-state variables (`layoutSpacing`, `edgeRenderMode`, `backgroundStyle`, `viewport`) in the helper closure so rerenders reuse them.

- [ ] **Step 6: Run the focused sync tests again**

Run:

```bash
node --test test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js
```

Expected:

```text
# fail 0
```

- [ ] **Step 7: Commit document-sync behavior**

Run:

```bash
git add src/extension-helpers/resolveCustomFlowEditor.js src/extension.cjs test/custom-editor-document-sync.test.js test/layout-spacing-message-contract.test.js
git commit -m "feat: sync custom editor from flow document changes"
```

---

### Task 4: Keep the Last Valid Graph When the DSL Is Invalid

**Files:**
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Modify: `src/webview/buildWebviewDocumentPayload.js`
- Modify: `src/webview-app/App.jsx`
- Modify: `src/webview-app/index.css`
- Modify: `test/render-graph-html.test.js`
- Create: `test/document-error-banner.test.js`

- [ ] **Step 1: Write the failing error payload test**

Add this test to `test/render-graph-html.test.js`:

```js
test('preserves document error state in the webview payload', () => {
  const html = renderGraphHtml({
    sourcePath: '/workspace/example.flow',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    documentError: 'Invalid edge line: edge start ->',
  })

  assert.match(html, /"documentError":"Invalid edge line: edge start ->"/)
})
```

- [ ] **Step 2: Write the failing banner contract test**

Create `test/document-error-banner.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('webview app renders a document error banner when parser errors exist', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /documentError/)
  assert.match(source, /app-document-error/)
  assert.match(source, /上一次有效图/)
})
```

- [ ] **Step 3: Run the focused failing tests**

Run:

```bash
node --test test/render-graph-html.test.js test/document-error-banner.test.js
```

Expected:

```text
not ok ... preserves document error state in the webview payload
not ok ... webview app renders a document error banner when parser errors exist
```

- [ ] **Step 4: Serialize and preserve `documentError`**

Update `src/webview/buildWebviewDocumentPayload.js`:

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
    documentError: documentModel.documentError,
    fitViewOnLoad: documentModel.fitViewOnLoad,
    fitViewRequestToken: documentModel.fitViewRequestToken,
  })
}
```

In `src/extension-helpers/resolveCustomFlowEditor.js`, keep one stable valid payload:

```js
let lastValidDocumentModel = documentModel

const refreshFromDocument = async () => {
  try {
    documentModel = await loadDiagramDocumentFromSource(document.uri.fsPath, document.getText())
    lastValidDocumentModel = documentModel
    await rerender({
      ...documentModel,
      documentError: null,
    })
  } catch (error) {
    await rerender({
      ...lastValidDocumentModel,
      documentError: error?.message ?? String(error),
    })
  }
}
```

- [ ] **Step 5: Render the error banner in the app**

In `src/webview-app/App.jsx`, read the field from the initial payload and render a banner before `TopToolbar`:

```jsx
  const documentError = initialDocument.documentError ?? null

  return (
    <main className="app-shell">
      {documentError ? (
        <div className="app-document-error" role="alert">
          <strong>DSL 解析失败</strong>
          <span>{documentError}</span>
          <span>当前仍显示上一次有效图。</span>
        </div>
      ) : null}
      <TopToolbar
```

In `src/webview-app/index.css`, add:

```css
.app-document-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(146, 48, 32, 0.12);
  color: var(--ink);
  font-size: 12px;
}

.app-document-error strong {
  font-weight: 700;
}
```

- [ ] **Step 6: Run the focused tests again**

Run:

```bash
node --test test/render-graph-html.test.js test/document-error-banner.test.js
```

Expected:

```text
# fail 0
```

- [ ] **Step 7: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected:

```text
# fail 0
> diagram-editor-mvp@0.0.1 build
```

- [ ] **Step 8: Manual Extension Host verification**

Run this flow manually:

```text
1. Press F5 in VS Code to open the Extension Host
2. Click example.flow
3. Confirm it opens directly in the graph editor
4. Run Reopen Editor With... and confirm Text Editor is available
5. Change a node label in the graph editor and save
6. Reopen with Text Editor and confirm the .flow text changed
7. Edit the .flow text in Text Editor, save, and confirm the graph editor refreshes without losing viewport/background style
8. Introduce an invalid DSL line, save, and confirm the graph remains visible with an error banner
9. Fix the DSL and confirm the graph recovers
```

Expected:

```text
- No command palette preview step is needed
- Viewport remains stable across text-driven refreshes
- Invalid DSL shows the last valid graph plus an error banner
```

- [ ] **Step 9: Commit the completed Custom Editor migration**

Run:

```bash
git add package.json src/extension.cjs src/extension-helpers/resolveCustomFlowEditor.js src/workspace/loadDiagramDocument.js src/webview/buildWebviewDocumentPayload.js src/webview-app/App.jsx src/webview-app/index.css test/custom-editor-package-contract.test.js test/custom-editor-registration.test.js test/custom-editor-document-sync.test.js test/document-error-banner.test.js test/load-diagram-document.test.js test/render-graph-html.test.js
git commit -m "feat: open .flow files in a custom editor"
```

---

## Self-Review

### Spec coverage

- Default `.flow` Custom Editor registration: Task 1
- Removal of old preview command: Task 1
- Document-driven host lifecycle: Task 2
- File-content-as-source-of-truth sync: Task 3
- View-state preservation on text refresh: Task 3
- Invalid DSL keeps last valid graph and shows errors: Task 4
- Automated and manual verification: Task 4

No approved spec requirement is missing from the plan.

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” placeholders remain
- All code-editing steps include concrete snippets
- All verification steps include explicit commands and expected outcomes

### Type consistency

- View type is consistently `diagramEditor.flowEditor`
- Session helper is consistently `resolveCustomFlowEditor`
- Error payload field is consistently `documentError`
- View-state fields remain `viewport`, `backgroundStyle`, `layoutSpacing`, and `edgeRenderMode`
