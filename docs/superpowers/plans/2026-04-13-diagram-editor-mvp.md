# Diagram Editor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code MVP that opens a custom diagram source file from the workspace, parses it into a graph model, preserves a separate layout file, and renders the graph in a webview for fast feasibility validation.

**Architecture:** Use a custom text DSL as the semantic source of truth and a sidecar JSON file as the layout source of truth. The extension host loads and saves files, the parser converts text into an internal graph model, and a minimal webview renders the graph plus exposes a thin message API for later visual editing.

**Tech Stack:** TypeScript, VS Code extension API, Node.js built-ins, lightweight DOM/SVG rendering, Node test runner / `node:assert`

---

### Task 1: Scaffold the extension and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.vscodeignore`
- Create: `src/extension.ts`
- Create: `src/test/run-tests.ts`
- Create: `src/test/dsl-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('placeholder test bootstraps the test runner', () => {
  assert.equal(typeof true, 'boolean')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/test/dsl-parser.test.ts`
Expected: FAIL with module or file-not-found errors because the scaffold does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "name": "diagram-editor-mvp",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p .",
    "test": "node --test dist/test/**/*.test.js"
  }
}
```

```ts
export function activate() {}
export function deactivate() {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with the placeholder test.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json .vscodeignore src/extension.ts src/test/run-tests.ts src/test/dsl-parser.test.ts
git commit -m "feat: scaffold diagram editor mvp extension"
```

### Task 2: Implement the custom DSL parser and graph model

**Files:**
- Create: `src/model/types.ts`
- Create: `src/model/parseDiagram.ts`
- Modify: `src/test/dsl-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('parses nodes and edges from the custom diagram DSL', () => {
  const text = [
    'dir LR',
    '',
    'node start "开始"',
    'node review "审批"',
    'edge start -> review',
  ].join('\n')

  const graph = parseDiagram(text)

  assert.equal(graph.direction, 'LR')
  assert.deepEqual(graph.nodes, [
    { id: 'start', label: '开始' },
    { id: 'review', label: '审批' },
  ])
  assert.deepEqual(graph.edges, [
    { from: 'start', to: 'review', label: undefined },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `parseDiagram` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type DiagramDirection = 'LR' | 'TB'

export interface DiagramNode {
  id: string
  label: string
}

export interface DiagramEdge {
  from: string
  to: string
  label?: string
}

export interface DiagramGraph {
  direction: DiagramDirection
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}
```

```ts
export function parseDiagram(source: string): DiagramGraph {
  const graph: DiagramGraph = { direction: 'LR', nodes: [], edges: [] }
  // parse "dir", "node", "edge" lines only
  return graph
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for parsing nodes and edges.

- [ ] **Step 5: Commit**

```bash
git add src/model/types.ts src/model/parseDiagram.ts src/test/dsl-parser.test.ts
git commit -m "feat: add diagram dsl parser"
```

### Task 3: Add layout sidecar loading and preservation

**Files:**
- Create: `src/model/layout.ts`
- Create: `src/test/layout.test.ts`
- Modify: `src/model/types.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('preserves layout for existing node ids and omits removed nodes', () => {
  const previous = {
    nodes: {
      start: { x: 10, y: 20, w: 140, h: 56 },
      removed: { x: 30, y: 40, w: 140, h: 56 },
    },
  }

  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = preserveLayout(previous, graph)

  assert.deepEqual(next.nodes.start, { x: 10, y: 20, w: 140, h: 56 })
  assert.ok(next.nodes.review)
  assert.equal(next.nodes.removed, undefined)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `preserveLayout` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface DiagramNodeLayout {
  x: number
  y: number
  w: number
  h: number
}

export interface DiagramLayoutFile {
  nodes: Record<string, DiagramNodeLayout>
}
```

```ts
export function preserveLayout(
  previous: DiagramLayoutFile,
  graph: DiagramGraph,
): DiagramLayoutFile {
  // keep matching ids, auto-place missing ids in a simple row
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for layout preservation.

- [ ] **Step 5: Commit**

```bash
git add src/model/layout.ts src/model/types.ts src/test/layout.test.ts
git commit -m "feat: preserve layout sidecar data"
```

### Task 4: Connect the extension command and webview

**Files:**
- Modify: `src/extension.ts`
- Create: `src/workspace/loadDiagramDocument.ts`
- Create: `src/webview/renderGraphHtml.ts`
- Create: `media/main.js`
- Create: `src/test/load-diagram-document.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('loads diagram source and layout into a single document model', async () => {
  const doc = await loadDiagramDocument(fakeFs, '/workspace/example.flow')
  assert.equal(doc.graph.nodes.length, 2)
  assert.equal(doc.layout.nodes.start.x, 80)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `loadDiagramDocument` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function loadDiagramDocument(fsLike: FsLike, sourcePath: string) {
  // read source, parse graph, read optional sidecar, preserve layout, return merged model
}
```

```ts
vscode.commands.registerCommand('diagramEditor.openPreview', async () => {
  // open a webview and render simple SVG boxes and lines
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for loading source + layout into one document model.

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts src/workspace/loadDiagramDocument.ts src/webview/renderGraphHtml.ts media/main.js src/test/load-diagram-document.test.ts
git commit -m "feat: add webview diagram preview command"
```

### Task 5: Add minimal visual editing loop for node moves

**Files:**
- Modify: `src/extension.ts`
- Modify: `media/main.js`
- Create: `src/workspace/saveLayoutFile.ts`
- Create: `src/test/save-layout-file.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('writes updated layout sidecar when a node move is posted from the webview', async () => {
  const writes: Array<{ path: string; content: string }> = []
  await saveLayoutFile(fakeFs, '/workspace/example.flow.layout.json', {
    nodes: { start: { x: 200, y: 120, w: 140, h: 56 } },
  })
  assert.match(writes[0]?.content ?? '', /"start"/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `saveLayoutFile` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function saveLayoutFile(fsLike: FsLike, path: string, layout: DiagramLayoutFile) {
  await fsLike.writeFile(path, JSON.stringify(layout, null, 2))
}
```

```ts
window.addEventListener('pointerup', () => {
  vscode.postMessage({ type: 'moveNode', nodeId, x, y })
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for sidecar persistence.

- [ ] **Step 5: Commit**

```bash
git add src/extension.ts media/main.js src/workspace/saveLayoutFile.ts src/test/save-layout-file.test.ts
git commit -m "feat: persist node move updates"
```

### Task 6: Verification and usage notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the failing test**

No code test. Manual verification only for this task.

- [ ] **Step 2: Run verification before docs**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 3: Write minimal documentation**

```md
1. Open this folder in VS Code.
2. Press F5 to run the extension host.
3. Create `example.flow`.
4. Run the `Diagram Editor: Open Preview` command.
```

- [ ] **Step 4: Run verification after docs**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add diagram editor mvp usage notes"
```
