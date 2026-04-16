# Multi-Edge Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support multiple distinct edges between the same two nodes by introducing stable runtime edge IDs, switching editing flows to `edgeId`, and rendering parallel edges with clear separation.

**Architecture:** Keep the `.flow` DSL unchanged. Add runtime-only `edge.id` values after parsing and when creating edges in the editor, migrate host/webview edge actions to prefer `edgeId`, convert phase-3 `edgeLabels` to use `edgeId` keys, and then add a conservative parallel-edge offset in the renderer for grouped `(from, to)` edges.

**Tech Stack:** Node.js model helpers, VS Code custom editor host, React, `@xyflow/react`, dagre, Node `node:test`

---

## File Structure

- Create: `src/model/withEdgeIds.js`
  Responsibility: assign stable runtime `edge.id` values to parsed graphs and provide a helper to create new unique edge IDs.
- Modify: `src/workspace/loadDiagramDocument.js`
  Responsibility: normalize parsed graphs with `withEdgeIds()` before layout.
- Modify: `src/model/createEdge.js`
  Responsibility: create edges with runtime IDs.
- Modify: `src/model/createSuccessorNode.js`
  Responsibility: pass new edge IDs when adding successor edges.
- Modify: `src/model/deleteEdge.js`
  Responsibility: delete by `edgeId`, with old `edgeRef` matching as fallback.
- Modify: `src/model/renameEdgeLabel.js`
  Responsibility: rename by `edgeId`, with old `edgeRef` matching as fallback.
- Modify: `src/model/buildLabelAugmentedGraph.js`
  Responsibility: key label-augmented mappings by `edge.id`.
- Modify: `src/model/layout.js`
  Responsibility: emit `layout.edgeLabels` keyed by `edge.id`.
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
  Responsibility: host message handlers prefer `edgeId` for delete/rename/create paths and duplicate checks.
- Modify: `src/webview-app/App.jsx`
  Responsibility: selected edge state and host messages prefer `edgeId`.
- Modify: `src/webview-app/state/reconcileSelectedElement.js`
  Responsibility: re-match selected edges by `edgeId`.
- Modify: `src/webview-app/actions/deleteSelectedElement.js`
  Responsibility: send `edgeId` when deleting selected edges.
- Modify: `src/webview-app/mapping/toFlowEdges.js`
  Responsibility: use runtime `edge.id` for XYFlow edge IDs, attach `labelLayout` by `edge.id`, and compute parallel-edge grouping metadata.
- Modify: `src/webview-app/components/edges/normalReadEdgePath.js`
  Responsibility: accept `parallelIndex` / `parallelCount` and apply conservative offset for multi-edges.
- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
  Responsibility: pass parallel-edge metadata into path generation while still preferring `labelLayout`.
- Create: `test/with-edge-ids.test.js`
  Responsibility: cover runtime edge ID assignment and new edge ID generation.
- Modify: `test/create-edge.test.js`
  Responsibility: assert new edges carry runtime IDs.
- Modify: `test/edit-graph.test.js`
  Responsibility: assert rename/delete by `edgeId` behavior.
- Modify: `test/to-flow-edges.test.js`
  Responsibility: assert runtime edge IDs, `labelLayout` by `edge.id`, and parallel-edge metadata.
- Modify: `test/delete-selection.test.js`
  Responsibility: assert UI delete action sends `edgeId`.
- Modify: `test/reconcile-selected-element.test.js`
  Responsibility: assert selected edges are refreshed by `edgeId`.
- Modify: `test/layout.test.js`
  Responsibility: assert `edgeLabels` are keyed by `edge.id` and reference diagrams can contain multiple same-endpoint edges.
- Create: `test/multi-edge-contract.test.js`
  Responsibility: verify host/webview message handling uses `edgeId` and no longer depends exclusively on `edgeRef`.

---

### Task 1: Add failing tests for runtime edge IDs

**Files:**
- Create: `test/with-edge-ids.test.js`
- Modify: `test/create-edge.test.js`
- Modify: `test/edit-graph.test.js`

- [ ] **Step 1: Write the failing `withEdgeIds()` tests**

Create `test/with-edge-ids.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { createEdgeId, withEdgeIds } from '../src/model/withEdgeIds.js'

test('adds stable runtime ids to parsed edges in source order', () => {
  const graph = withEdgeIds({
    direction: 'LR',
    nodes: [],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
      { from: 'start', to: 'review', label: '澄清' },
    ],
  })

  assert.deepEqual(
    graph.edges.map((edge) => edge.id),
    ['edge_1', 'edge_2'],
  )
})

test('preserves existing runtime ids when normalizing a graph again', () => {
  const graph = withEdgeIds({
    direction: 'LR',
    nodes: [],
    edges: [
      { id: 'edge_7', from: 'start', to: 'review', label: '通过' },
    ],
  })

  assert.equal(graph.edges[0].id, 'edge_7')
})

test('creates the next available edge id from an existing graph', () => {
  const edgeId = createEdgeId([
    { id: 'edge_1' },
    { id: 'edge_2' },
    { id: 'edge_8' },
  ])

  assert.equal(edgeId, 'edge_9')
})
```

- [ ] **Step 2: Extend edge creation and edit tests**

Update `test/create-edge.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { createEdge } from '../src/model/createEdge.js'
import { serializeDiagram } from '../src/model/serializeDiagram.js'

test('creates a new edge with a runtime id and serializes it back to the DSL', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [],
  }

  const next = createEdge(graph, { id: 'edge_1', from: 'start', to: 'review' })

  assert.equal(next.edges[0].id, 'edge_1')
  assert.match(serializeDiagram(next), /edge start -> review/)
  assert.doesNotMatch(serializeDiagram(next), /edge_1/)
})
```

Append to `test/edit-graph.test.js`:

```js
test('renames and deletes edges by runtime id', () => {
  const graph = {
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { id: 'edge_1', from: 'start', to: 'review', label: '通过' },
      { id: 'edge_2', from: 'start', to: 'review', label: '澄清' },
    ],
  }

  const renamed = renameEdgeLabel(graph, { edgeId: 'edge_2' }, '补充信息')
  assert.deepEqual(
    renamed.edges.map((edge) => ({ id: edge.id, label: edge.label })),
    [
      { id: 'edge_1', label: '通过' },
      { id: 'edge_2', label: '补充信息' },
    ],
  )

  const deleted = deleteEdge(renamed, { edgeId: 'edge_1' })
  assert.deepEqual(
    deleted.edges.map((edge) => edge.id),
    ['edge_2'],
  )
})
```

- [ ] **Step 3: Run the focused tests to verify they fail**

Run:

```bash
node --test test/with-edge-ids.test.js test/create-edge.test.js test/edit-graph.test.js
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `withEdgeIds.js`
- existing edit helpers fail because they still depend on `edgeRef`

- [ ] **Step 4: Commit the red tests**

```bash
git add test/with-edge-ids.test.js test/create-edge.test.js test/edit-graph.test.js
git commit -m "test: cover runtime edge ids"
```

---

### Task 2: Implement runtime edge IDs and migrate edit helpers

**Files:**
- Create: `src/model/withEdgeIds.js`
- Modify: `src/workspace/loadDiagramDocument.js`
- Modify: `src/model/createEdge.js`
- Modify: `src/model/createSuccessorNode.js`
- Modify: `src/model/deleteEdge.js`
- Modify: `src/model/renameEdgeLabel.js`
- Test: `test/with-edge-ids.test.js`
- Test: `test/create-edge.test.js`
- Test: `test/edit-graph.test.js`

- [ ] **Step 1: Implement `withEdgeIds()`**

Create `src/model/withEdgeIds.js`:

```js
const EDGE_ID_PREFIX = 'edge_'

export function withEdgeIds(graph) {
  let nextCounter = 1

  const edges = graph.edges.map((edge) => {
    const existingId = edge.id
    if (existingId) {
      nextCounter = Math.max(nextCounter, toEdgeNumber(existingId) + 1)
      return edge
    }

    const id = `${EDGE_ID_PREFIX}${nextCounter}`
    nextCounter += 1
    return { ...edge, id }
  })

  return {
    ...graph,
    edges,
  }
}

export function createEdgeId(edges) {
  const maxEdgeNumber = edges.reduce(
    (max, edge) => Math.max(max, toEdgeNumber(edge.id)),
    0,
  )

  return `${EDGE_ID_PREFIX}${maxEdgeNumber + 1}`
}

function toEdgeNumber(edgeId) {
  if (typeof edgeId !== 'string' || !edgeId.startsWith(EDGE_ID_PREFIX)) {
    return 0
  }

  const value = Number(edgeId.slice(EDGE_ID_PREFIX.length))
  return Number.isFinite(value) ? value : 0
}
```

- [ ] **Step 2: Normalize parsed graphs with runtime edge IDs**

Update `src/workspace/loadDiagramDocument.js`:

```js
import { autoLayoutGraph } from '../model/layout.js'
import { parseDiagram } from '../model/parseDiagram.js'
import { withEdgeIds } from '../model/withEdgeIds.js'

export async function loadDiagramDocumentFromSource(sourcePath, sourceText) {
  const graph = withEdgeIds(parseDiagram(sourceText))
  const layout = autoLayoutGraph(graph)

  return {
    sourcePath,
    sourceText,
    graph,
    layout,
  }
}
```

- [ ] **Step 3: Create and edit edges by `id`**

Update `src/model/createEdge.js`:

```js
export function createEdge(graph, edge) {
  return {
    ...graph,
    edges: [...graph.edges, edge],
  }
}
```

Update `src/model/createSuccessorNode.js`:

```js
import { createEdge } from './createEdge.js'

export function createSuccessorNode(graph, fromNodeId, newNode, newEdgeId) {
  const parentIndex = graph.nodes.findIndex((node) => node.id === fromNodeId)
  const nextNodes = parentIndex === -1
    ? [...graph.nodes, newNode]
    : [
        ...graph.nodes.slice(0, parentIndex + 1),
        newNode,
        ...graph.nodes.slice(parentIndex + 1),
      ]

  return createEdge(
    {
      ...graph,
      nodes: nextNodes,
    },
    { id: newEdgeId, from: fromNodeId, to: newNode.id, label: undefined },
  )
}
```

Update `src/model/deleteEdge.js`:

```js
import { edgeMatchesRef } from './edgeRef.js'

export function deleteEdge(graph, edgeIdentity) {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => !edgeMatchesIdentity(edge, edgeIdentity)),
  }
}

function edgeMatchesIdentity(edge, edgeIdentity) {
  if (edgeIdentity?.edgeId) {
    return edge.id === edgeIdentity.edgeId
  }

  return edgeMatchesRef(edge, edgeIdentity)
}
```

Update `src/model/renameEdgeLabel.js`:

```js
import { edgeMatchesRef } from './edgeRef.js'

export function renameEdgeLabel(graph, edgeIdentity, nextLabel) {
  return {
    ...graph,
    edges: graph.edges.map((edge) =>
      edgeMatchesIdentity(edge, edgeIdentity)
        ? { ...edge, label: nextLabel || undefined }
        : edge,
    ),
  }
}

function edgeMatchesIdentity(edge, edgeIdentity) {
  if (edgeIdentity?.edgeId) {
    return edge.id === edgeIdentity.edgeId
  }

  return edgeMatchesRef(edge, edgeIdentity)
}
```

- [ ] **Step 4: Run focused tests and make them pass**

Run:

```bash
node --test test/with-edge-ids.test.js test/create-edge.test.js test/edit-graph.test.js
```

Expected:
- runtime edge ID tests pass
- rename/delete by `edgeId` passes

- [ ] **Step 5: Commit the edge-id model changes**

```bash
git add src/model/withEdgeIds.js src/workspace/loadDiagramDocument.js src/model/createEdge.js src/model/createSuccessorNode.js src/model/deleteEdge.js src/model/renameEdgeLabel.js test/with-edge-ids.test.js test/create-edge.test.js test/edit-graph.test.js
git commit -m "feat: add runtime edge ids"
```

---

### Task 3: Migrate host and webview edge actions to `edgeId`

**Files:**
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Modify: `src/webview-app/App.jsx`
- Modify: `src/webview-app/actions/deleteSelectedElement.js`
- Modify: `src/webview-app/state/reconcileSelectedElement.js`
- Create: `test/multi-edge-contract.test.js`
- Modify: `test/delete-selection.test.js`
- Modify: `test/reconcile-selected-element.test.js`

- [ ] **Step 1: Write the failing host/webview contract tests**

Create `test/multi-edge-contract.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('custom flow editor prefers edgeId for edge delete and rename operations', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /message\?\.edgeId/)
  assert.match(source, /edgeId:\s*message\.edgeId/)
})

test('webview app tracks selected edges by edgeId', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /edgeId:/)
  assert.match(source, /selectedElement\?\.edgeId/)
})
```

Update `test/delete-selection.test.js`:

```js
test('deletes a selected edge by edgeId', () => {
  const messages = []
  const edgeRef = { from: 'review', to: 'done', label: '通过' }

  deleteSelectedElement({
    selectedElement: { type: 'edge', edgeId: 'edge_2', edgeRef },
    postToHost: (message) => messages.push(message),
  })

  assert.deepEqual(messages, [{ type: 'deleteEdge', edgeId: 'edge_2', edge: edgeRef }])
})
```

Update `test/reconcile-selected-element.test.js`:

```js
test('refreshes selected edge identity from the synced edge by edgeId', () => {
  const next = reconcileSelectedElement(
    { type: 'edge', id: 'edge_2', edgeId: 'edge_2', edgeRef: { from: 'start', to: 'done', label: 'old' } },
    [],
    [
      {
        id: 'edge_2',
        data: { edgeId: 'edge_2', edgeRef: { from: 'start', to: 'done', label: 'ok' } },
      },
    ],
  )

  assert.deepEqual(next, {
    type: 'edge',
    id: 'edge_2',
    edgeId: 'edge_2',
    edgeRef: { from: 'start', to: 'done', label: 'ok' },
  })
})
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
node --test test/multi-edge-contract.test.js test/delete-selection.test.js test/reconcile-selected-element.test.js
```

Expected:
- contract tests fail because host/webview do not reference `edgeId`
- delete/reconcile tests fail because selected edge state is still `edgeRef`-first

- [ ] **Step 3: Switch edge actions to prefer `edgeId`**

Update `src/webview-app/actions/deleteSelectedElement.js`:

```js
export function deleteSelectedElement({ selectedElement, postToHost }) {
  if (!selectedElement) {
    return
  }

  if (selectedElement.type === 'node') {
    postToHost({ type: 'deleteNode', nodeId: selectedElement.id })
    return
  }

  if (selectedElement.type === 'edge') {
    postToHost({
      type: 'deleteEdge',
      edgeId: selectedElement.edgeId,
      edge: selectedElement.edgeRef,
    })
  }
}
```

Update `src/webview-app/state/reconcileSelectedElement.js`:

```js
export function reconcileSelectedElement(selectedElement, nodes, edges) {
  if (!selectedElement) {
    return null
  }

  if (selectedElement.type === 'node') {
    return nodes.some((node) => node.id === selectedElement.id) ? selectedElement : null
  }

  if (selectedElement.type === 'edge') {
    const nextEdge = edges.find((edge) => edge.data?.edgeId === selectedElement.edgeId)
    if (!nextEdge) {
      return null
    }

    return {
      type: 'edge',
      id: nextEdge.id,
      edgeId: nextEdge.data.edgeId,
      edgeRef: nextEdge.data.edgeRef,
    }
  }

  return null
}
```

Update the edge selection and rename/delete payloads in `src/webview-app/App.jsx`:

```js
  const handleEdgeClick = React.useCallback((_event, edge) => {
    setSelectedElement({
      type: 'edge',
      id: edge.id,
      edgeId: edge.data.edgeId,
      edgeRef: edge.data.edgeRef,
    })
  }, [])
```

```js
    postToHost({
      type: 'renameEdgeLabel',
      edgeId: selectedElement.edgeId,
      edge: edgeRef,
      label: trimmedLabel,
    })
```

Update `src/extension-helpers/resolveCustomFlowEditor.js` edge branches:

```js
      if (message?.type === 'deleteEdge') {
        const edgeIdentity = message.edgeId ? { edgeId: message.edgeId } : message.edge
        if (!edgeIdentity) {
          return
        }

        documentModel.graph = deleteEdge(documentModel.graph, edgeIdentity)
        const mode = await persistGraph()
        postHostDebug(webviewPanel, `deleteEdge saved via ${mode}`)
        await postSyncState()
        return
      }
```

```js
      if (message?.type === 'renameEdgeLabel') {
        const edgeIdentity = message.edgeId ? { edgeId: message.edgeId } : message.edge
        if (!edgeIdentity) {
          return
        }
```

- [ ] **Step 4: Run focused tests and make them pass**

Run:

```bash
node --test test/multi-edge-contract.test.js test/delete-selection.test.js test/reconcile-selected-element.test.js
```

Expected:
- contract and interaction tests pass

- [ ] **Step 5: Commit the `edgeId` interaction migration**

```bash
git add src/extension-helpers/resolveCustomFlowEditor.js src/webview-app/App.jsx src/webview-app/actions/deleteSelectedElement.js src/webview-app/state/reconcileSelectedElement.js test/multi-edge-contract.test.js test/delete-selection.test.js test/reconcile-selected-element.test.js
git commit -m "feat: track edge actions by edge id"
```

---

### Task 4: Convert phase-3 `edgeLabels` and edge mapping to `edgeId`

**Files:**
- Modify: `src/model/buildLabelAugmentedGraph.js`
- Modify: `src/model/layout.js`
- Modify: `src/webview-app/mapping/toFlowEdges.js`
- Modify: `test/to-flow-edges.test.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing `edgeLabels`-by-id tests**

Append to `test/to-flow-edges.test.js`:

```js
test('binds labelLayout by runtime edge id instead of from-to-label key', () => {
  const edges = toFlowEdges(
    [{ id: 'edge_2', from: 'start', to: 'review', label: '通过' }],
    [{ id: 'start', label: '开始' }, { id: 'review', label: '审批' }],
    {
      nodes: {
        start: { x: 80, y: 120, w: 132, h: 46 },
        review: { x: 280, y: 120, w: 132, h: 46 },
      },
      edgeLabels: {
        edge_2: { x: 180, y: 96, w: 52, h: 24 },
      },
    },
  )

  assert.equal(edges[0].id, 'edge_2')
  assert.deepEqual(edges[0].data.labelLayout, { x: 180, y: 96, w: 52, h: 24 })
})
```

Append to `test/layout.test.js`:

```js
test('auto-layout keys edgeLabels by runtime edge id', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { id: 'edge_1', from: 'start', to: 'review', label: '通过' },
    ],
  })

  assert.ok(next.edgeLabels.edge_1)
  assert.equal(next.edgeLabels['start->review#通过'], undefined)
})
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
node --test test/to-flow-edges.test.js test/layout.test.js
```

Expected:
- tests fail because `edgeLabels` still use old keys and `toFlowEdges()` still derives edge IDs from content

- [ ] **Step 3: Switch `edgeLabels` and mapping to `edge.id`**

Update `src/model/buildLabelAugmentedGraph.js` so the map is keyed by `edge.id` and dummy IDs include the edge ID:

```js
    const edgeKey = edge.id
```

```js
    const labelNodeId = `__edge_label__:${edge.id}`
```

Update `src/model/layout.js` extraction loop to keep `layout.edgeLabels[edge.id]`.

Update `src/webview-app/mapping/toFlowEdges.js`:

```js
    const edgeId = edge.id ?? `${edge.from}->${edge.to}#${edge.label ?? ''}`
```

```js
      data: {
        edgeId,
        edgeRef,
        ...(sourceNode ? { sourceNode } : {}),
        ...(targetNode ? { targetNode } : {}),
        ...(layout?.edgeLabels?.[edgeId] ? { labelLayout: layout.edgeLabels[edgeId] } : {}),
      },
```

- [ ] **Step 4: Run focused tests and make them pass**

Run:

```bash
node --test test/to-flow-edges.test.js test/layout.test.js
```

Expected:
- `edgeLabels` and XYFlow edges use runtime edge IDs

- [ ] **Step 5: Commit the edge-label key migration**

```bash
git add src/model/buildLabelAugmentedGraph.js src/model/layout.js src/webview-app/mapping/toFlowEdges.js test/to-flow-edges.test.js test/layout.test.js
git commit -m "feat: key edge label layout by edge id"
```

---

### Task 5: Render parallel edges with conservative offsets

**Files:**
- Modify: `src/webview-app/mapping/toFlowEdges.js`
- Modify: `src/webview-app/components/edges/normalReadEdgePath.js`
- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
- Create: `test/multi-edge-rendering.test.js`

- [ ] **Step 1: Write the failing multi-edge rendering tests**

Create `test/multi-edge-rendering.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toFlowEdges } from '../src/webview-app/mapping/toFlowEdges.js'
import { toNormalReadEdgePath } from '../src/webview-app/components/edges/normalReadEdgePath.js'

test('assigns stable parallel-edge metadata for same-endpoint edges', () => {
  const edges = toFlowEdges([
    { id: 'edge_1', from: 'control', to: 'stageTwo', label: 'execute' },
    { id: 'edge_2', from: 'control', to: 'stageTwo', label: 'clarify' },
    { id: 'edge_3', from: 'control', to: 'stageTwo', label: 'task_mode' },
  ])

  assert.deepEqual(
    edges.map((edge) => ({
      id: edge.id,
      parallelIndex: edge.data.parallelIndex,
      parallelCount: edge.data.parallelCount,
    })),
    [
      { id: 'edge_1', parallelIndex: -1, parallelCount: 3 },
      { id: 'edge_2', parallelIndex: 0, parallelCount: 3 },
      { id: 'edge_3', parallelIndex: 1, parallelCount: 3 },
    ],
  )
})

test('offsets curved paths when parallelCount is greater than one', () => {
  const base = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    parallelIndex: 0,
    parallelCount: 1,
  })
  const shifted = toNormalReadEdgePath({
    sourceX: 120,
    sourceY: 180,
    targetX: 360,
    targetY: 200,
    parallelIndex: 1,
    parallelCount: 3,
  })

  assert.notEqual(shifted.path, base.path)
})
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
node --test test/multi-edge-rendering.test.js
```

Expected:
- tests fail because no parallel metadata or offset handling exists yet

- [ ] **Step 3: Add parallel-edge metadata in `toFlowEdges()`**

At the top of `src/webview-app/mapping/toFlowEdges.js`, add:

```js
function buildParallelEdgeGroups(graphEdges) {
  const groups = new Map()

  for (const edge of graphEdges) {
    const key = `${edge.from}=>${edge.to}`
    const group = groups.get(key) ?? []
    group.push(edge)
    groups.set(key, group)
  }

  return groups
}

function toParallelIndex(index, count) {
  return index - (count - 1) / 2
}
```

Inside `toFlowEdges()`:

```js
  const parallelGroups = buildParallelEdgeGroups(graphEdges)
```

And inside the edge map:

```js
    const parallelGroup = parallelGroups.get(`${edge.from}=>${edge.to}`) ?? [edge]
    const parallelPosition = parallelGroup.findIndex((candidate) => candidate.id === edge.id)
    const parallelCount = parallelGroup.length
    const parallelIndex = toParallelIndex(parallelPosition, parallelCount)
```

Add to `flowEdge.data`:

```js
        edgeId,
        parallelIndex,
        parallelCount,
```

- [ ] **Step 4: Offset paths in `toNormalReadEdgePath()`**

Update the function signature:

```js
export function toNormalReadEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  parallelIndex = 0,
  parallelCount = 1,
}) {
```

Add helpers near the bottom:

```js
const PARALLEL_EDGE_OFFSET = 18
```

```js
function applyParallelOffset(fromPoint, toPoint, parallelIndex, parallelCount) {
  if (parallelCount <= 1 || !parallelIndex) {
    return { fromPoint, toPoint }
  }

  const dx = toPoint.x - fromPoint.x
  const dy = toPoint.y - fromPoint.y
  const length = Math.hypot(dx, dy) || 1
  const offsetX = (-dy / length) * parallelIndex * PARALLEL_EDGE_OFFSET
  const offsetY = (dx / length) * parallelIndex * PARALLEL_EDGE_OFFSET

  return {
    fromPoint: {
      x: Math.round(fromPoint.x + offsetX),
      y: Math.round(fromPoint.y + offsetY),
    },
    toPoint: {
      x: Math.round(toPoint.x + offsetX),
      y: Math.round(toPoint.y + offsetY),
    },
  }
}
```

Before `resolveHandlePosition(...)`, add:

```js
  const { fromPoint: offsetSource, toPoint: offsetTarget } = applyParallelOffset(
    clippedSource,
    clippedTarget,
    parallelIndex,
    parallelCount,
  )
```

Then use `offsetSource` / `offsetTarget` for positions and Bezier input.

- [ ] **Step 5: Pass parallel metadata through `NormalReadEdge.jsx`**

Update `src/webview-app/components/edges/NormalReadEdge.jsx`:

```js
  const geometry = toNormalReadEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceNode: data?.sourceNode,
    targetNode: data?.targetNode,
    parallelIndex: data?.parallelIndex,
    parallelCount: data?.parallelCount,
  })
```

- [ ] **Step 6: Run focused tests and make them pass**

Run:

```bash
node --test test/multi-edge-rendering.test.js test/to-flow-edges.test.js test/normal-read-edge-path.test.js
```

Expected:
- same-endpoint edges receive stable parallel metadata
- offset paths differ from the single-edge baseline

- [ ] **Step 7: Commit the multi-edge rendering**

```bash
git add src/webview-app/mapping/toFlowEdges.js src/webview-app/components/edges/normalReadEdgePath.js src/webview-app/components/edges/NormalReadEdge.jsx test/multi-edge-rendering.test.js test/to-flow-edges.test.js test/normal-read-edge-path.test.js
git commit -m "feat: render parallel multi-edges"
```

---

### Task 6: Verify reference diagrams and repository health

**Files:**
- Modify: `test/layout.test.js`

- [ ] **Step 1: Add a same-endpoint reference regression test**

Append to `test/layout.test.js`:

```js
test('auto-layout preserves multiple labeled edges between the same endpoints', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    nodes: [
      { id: 'control', label: '控制器' },
      { id: 'stageTwo', label: '第二阶段' },
    ],
    edges: [
      { id: 'edge_1', from: 'control', to: 'stageTwo', label: 'execute' },
      { id: 'edge_2', from: 'control', to: 'stageTwo', label: 'clarify' },
      { id: 'edge_3', from: 'control', to: 'stageTwo', label: 'task_mode' },
    ],
  })

  assert.ok(next.edgeLabels.edge_1)
  assert.ok(next.edgeLabels.edge_2)
  assert.ok(next.edgeLabels.edge_3)
})
```

- [ ] **Step 2: Run multi-edge focused verification**

Run:

```bash
node --test test/with-edge-ids.test.js test/create-edge.test.js test/edit-graph.test.js test/multi-edge-contract.test.js test/delete-selection.test.js test/reconcile-selected-element.test.js test/to-flow-edges.test.js test/multi-edge-rendering.test.js test/layout.test.js
```

Expected:
- all multi-edge related suites pass

- [ ] **Step 3: Run the full repository test suite**

Run:

```bash
npm test
```

Expected:
- all new multi-edge tests pass
- if `test/custom-editor-registration.test.js` still fails because it references `src/extension.cjs`, note it as a pre-existing unrelated failure

- [ ] **Step 4: Commit the regression verification**

```bash
git add test/layout.test.js
git commit -m "test: verify multi-edge behavior"
```

---

## Self-Review

- Spec coverage:
  - runtime `edge.id`: covered in Tasks 1 and 2
  - edge actions by `edgeId`: covered in Task 3
  - phase-3 `edgeLabels` by `edgeId`: covered in Task 4
  - parallel rendering: covered in Task 5
  - reference regression: covered in Task 6
- Placeholder scan:
  - no `TODO`, `TBD`, or vague placeholders remain
- Type consistency:
  - field name is consistently `edgeId` in host/webview messages
  - runtime edge field stays `id`
  - label layout map is consistently keyed by `edge.id`
