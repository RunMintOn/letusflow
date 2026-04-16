# Edge Label Dummy Node Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make labeled edges participate in layout by introducing internal dummy label nodes, then expose stable `edgeLabels` geometry to the renderer without changing the external `.flow` graph contract.

**Architecture:** Keep the current `.flow` parser, host/webview sync, and XYFlow graph model. Inside `autoLayoutGraph()`, build a temporary label-augmented graph for Dagre, extract real node boxes plus `edgeLabels` layout boxes, keep phase-2 post-layout limited to real nodes, and let the renderer prefer `labelLayout` when present.

**Tech Stack:** dagre, plain JavaScript model helpers, React, `@xyflow/react`, Node `node:test`

---

## File Structure

- Create: `src/model/edgeLabelDimensions.js`
  Responsibility: estimate width/height for edge-label dummy nodes using stable text heuristics aligned with current edge label styling.
- Create: `src/model/buildLabelAugmentedGraph.js`
  Responsibility: expand labeled edges into dummy label nodes plus split edges, while preserving a stable mapping back to original edges.
- Modify: `src/model/layout.js`
  Responsibility: run Dagre on the label-augmented graph, output `layout.edgeLabels`, and keep real-node post-layout separate from dummy label nodes.
- Modify: `src/model/postLayoutRanks.js`
  Responsibility: ignore dummy label nodes so phase-2 rank reordering only acts on real nodes.
- Modify: `src/model/derivePrimaryFlow.js`
  Responsibility: ignore dummy label nodes and continue scoring only real nodes.
- Modify: `src/webview-app/mapping/toFlowEdges.js`
  Responsibility: attach `labelLayout` from `layout.edgeLabels` to `edge.data` when available.
- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
  Responsibility: prefer `data.labelLayout` for `labelX/labelY`, with fallback to the existing path-derived label position.
- Modify: `test/to-flow-edges.test.js`
  Responsibility: verify `labelLayout` is passed through for labeled edges only.
- Modify: `test/normal-read-edge-component-contract.test.js`
  Responsibility: verify the edge component reads `data.labelLayout`.
- Modify: `test/layout.test.js`
  Responsibility: verify `layout.edgeLabels` exists for labeled edges and real reference diagrams stay stable.
- Create: `test/build-label-augmented-graph.test.js`
  Responsibility: verify label edge expansion and stable mappings.
- Create: `test/edge-label-dimensions.test.js`
  Responsibility: verify label dummy-node dimension estimation.

---

### Task 1: Add failing tests for the internal label-augmented graph

**Files:**
- Create: `test/edge-label-dimensions.test.js`
- Create: `test/build-label-augmented-graph.test.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing edge-label dimension tests**

Create `test/edge-label-dimensions.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { getEdgeLabelDimensions } from '../src/model/edgeLabelDimensions.js'

test('gives short labels a minimum readable box', () => {
  assert.deepEqual(getEdgeLabelDimensions('执行'), { w: 52, h: 24 })
})

test('grows width for longer edge labels but keeps a stable height', () => {
  const short = getEdgeLabelDimensions('执行')
  const long = getEdgeLabelDimensions('反馈观察结果 (Loop)')

  assert.equal(short.h, 24)
  assert.equal(long.h, 24)
  assert.ok(long.w > short.w)
})
```

- [ ] **Step 2: Write the failing label-augmented graph tests**

Create `test/build-label-augmented-graph.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { buildLabelAugmentedGraph } from '../src/model/buildLabelAugmentedGraph.js'

test('splits only labeled edges into dummy label nodes and segment edges', () => {
  const next = buildLabelAugmentedGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
      { from: 'review', to: 'done' },
    ],
  })

  assert.ok(next.graph.nodes.some((node) => node.id.startsWith('__edge_label__:start->review#通过')))
  assert.equal(next.graph.edges.length, 3)
  assert.deepEqual(Object.keys(next.edgeLabelMap), ['start->review#通过'])
})

test('keeps unlabeled edges untouched in the augmented graph', () => {
  const next = buildLabelAugmentedGraph({
    direction: 'TD',
    nodes: [
      { id: 'task', label: '任务模式' },
      { id: 'planner', label: '执行规划' },
    ],
    edges: [
      { from: 'task', to: 'planner' },
    ],
  })

  assert.equal(next.graph.nodes.length, 2)
  assert.equal(next.graph.edges.length, 1)
  assert.deepEqual(next.edgeLabelMap, {})
})
```

- [ ] **Step 3: Extend layout coverage for `edgeLabels` output**

Append to `test/layout.test.js`:

```js
test('auto-layout returns edge label boxes for labeled edges without exposing dummy nodes', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
    ],
    edges: [
      { from: 'start', to: 'review', label: '通过' },
    ],
  })

  assert.deepEqual(Object.keys(next.nodes), ['start', 'review'])
  assert.deepEqual(Object.keys(next.edgeLabels), ['start->review#通过'])
  assert.ok(next.edgeLabels['start->review#通过'].w >= 52)
})
```

- [ ] **Step 4: Run the focused tests to verify they fail**

Run:

```bash
node --test test/edge-label-dimensions.test.js test/build-label-augmented-graph.test.js test/layout.test.js
```

Expected:
- `ERR_MODULE_NOT_FOUND` for the new helper modules
- the new `layout.test.js` case fails because `edgeLabels` is not produced yet

- [ ] **Step 5: Commit the red tests**

```bash
git add test/edge-label-dimensions.test.js test/build-label-augmented-graph.test.js test/layout.test.js
git commit -m "test: cover edge label dummy-node layout"
```

---

### Task 2: Implement layout-layer dummy label nodes

**Files:**
- Create: `src/model/edgeLabelDimensions.js`
- Create: `src/model/buildLabelAugmentedGraph.js`
- Modify: `src/model/layout.js`
- Modify: `src/model/derivePrimaryFlow.js`
- Modify: `src/model/postLayoutRanks.js`
- Test: `test/edge-label-dimensions.test.js`
- Test: `test/build-label-augmented-graph.test.js`
- Test: `test/layout.test.js`

- [ ] **Step 1: Implement `getEdgeLabelDimensions()`**

Create `src/model/edgeLabelDimensions.js`:

```js
const MIN_EDGE_LABEL_WIDTH = 52
const EDGE_LABEL_HEIGHT = 24
const EDGE_LABEL_HORIZONTAL_PADDING = 20
const EDGE_LABEL_CHARACTER_WIDTH = 7

export function getEdgeLabelDimensions(label) {
  const text = String(label ?? '')

  return {
    w: Math.max(
      MIN_EDGE_LABEL_WIDTH,
      Math.round(text.length * EDGE_LABEL_CHARACTER_WIDTH + EDGE_LABEL_HORIZONTAL_PADDING),
    ),
    h: EDGE_LABEL_HEIGHT,
  }
}
```

- [ ] **Step 2: Implement `buildLabelAugmentedGraph()`**

Create `src/model/buildLabelAugmentedGraph.js`:

```js
import { getEdgeLabelDimensions } from './edgeLabelDimensions.js'

export function buildLabelAugmentedGraph(graph) {
  const nextNodes = [...graph.nodes]
  const nextEdges = []
  const edgeLabelMap = {}

  for (const edge of graph.edges) {
    const edgeKey = toEdgeKey(edge)
    const hasLabel = typeof edge.label === 'string' && edge.label.trim().length > 0

    if (!hasLabel) {
      nextEdges.push(edge)
      continue
    }

    const labelNodeId = `__edge_label__:${edgeKey}`
    const labelDimensions = getEdgeLabelDimensions(edge.label)

    nextNodes.push({
      id: labelNodeId,
      label: edge.label,
      isLabelNode: true,
      labelDimensions,
    })

    nextEdges.push({ from: edge.from, to: labelNodeId })
    nextEdges.push({ from: labelNodeId, to: edge.to })

    edgeLabelMap[edgeKey] = {
      originalEdge: edge,
      labelNodeId,
      labelDimensions,
    }
  }

  return {
    graph: {
      ...graph,
      nodes: nextNodes,
      edges: nextEdges,
    },
    edgeLabelMap,
  }
}

export function toEdgeKey(edge) {
  return `${edge.from}->${edge.to}#${edge.label ?? ''}`
}
```

- [ ] **Step 3: Run Dagre on the augmented graph and emit `edgeLabels`**

Update `src/model/layout.js` imports:

```js
import { buildLabelAugmentedGraph, toEdgeKey } from './buildLabelAugmentedGraph.js'
```

Change the top of `autoLayoutGraph()` to build the augmented graph:

```js
  const spacing = toDagreSpacing(options)
  const { graph: augmentedGraph, edgeLabelMap } = buildLabelAugmentedGraph(graph)
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true })
  dagreGraph.setGraph({
    rankdir: graph.direction === 'TB' || graph.direction === 'TD' ? 'TB' : 'LR',
    ranksep: spacing.ranksep,
    nodesep: spacing.nodesep,
    marginx: DAGRE_MARGIN,
    marginy: DAGRE_MARGIN,
  })
```

Replace the node loop with:

```js
  for (const node of augmentedGraph.nodes) {
    const dimensions = node.isLabelNode
      ? node.labelDimensions
      : getNodeDimensions(node)
    dagreGraph.setNode(node.id, {
      width: dimensions.w,
      height: dimensions.h,
    })
  }
```

Replace the edge loop with:

```js
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))

  augmentedGraph.edges.forEach((edge, index) => {
    dagreGraph.setEdge(
      edge.from,
      edge.to,
      toDagreEdgePriority(edge, nodeOrder),
      `${edge.from}->${edge.to}#${index}`,
    )
  })
```

Replace the layout extraction with:

```js
  dagre.layout(dagreGraph)
  const layout = { nodes: {}, edgeLabels: {} }

  for (const node of graph.nodes) {
    const dimensions = getNodeDimensions(node)
    const laidOutNode = dagreGraph.node(node.id) ?? { x: dimensions.w / 2, y: dimensions.h / 2 }
    layout.nodes[node.id] = {
      x: Math.round(laidOutNode.x - dimensions.w / 2),
      y: Math.round(laidOutNode.y - dimensions.h / 2),
      w: dimensions.w,
      h: dimensions.h,
    }
  }

  for (const [edgeKey, meta] of Object.entries(edgeLabelMap)) {
    const laidOutNode = dagreGraph.node(meta.labelNodeId)
    if (!laidOutNode) {
      continue
    }

    layout.edgeLabels[edgeKey] = {
      x: Math.round(laidOutNode.x - meta.labelDimensions.w / 2),
      y: Math.round(laidOutNode.y - meta.labelDimensions.h / 2),
      w: meta.labelDimensions.w,
      h: meta.labelDimensions.h,
    }
  }
```

- [ ] **Step 4: Make phase-2 helpers ignore dummy label nodes**

Update `src/model/derivePrimaryFlow.js` inside the node loop:

```js
  for (const node of graph.nodes) {
    if (node.isLabelNode) {
      continue
    }
```

Update `src/model/postLayoutRanks.js` inside the graph-node loop:

```js
  for (const node of graph.nodes) {
    if (node.isLabelNode) {
      continue
    }
```

And keep `nodeOrder` derived from real nodes only:

```js
  const nodeOrder = new Map(
    graph.nodes
      .filter((node) => !node.isLabelNode)
      .map((node, index) => [node.id, index]),
  )
```

- [ ] **Step 5: Run focused tests and make them pass**

Run:

```bash
node --test test/edge-label-dimensions.test.js test/build-label-augmented-graph.test.js test/layout.test.js
```

Expected:
- new helper suites pass
- `layout.test.js` shows `edgeLabels` output for labeled edges

- [ ] **Step 6: Commit the layout-layer dummy label nodes**

```bash
git add src/model/edgeLabelDimensions.js src/model/buildLabelAugmentedGraph.js src/model/layout.js src/model/derivePrimaryFlow.js src/model/postLayoutRanks.js test/edge-label-dimensions.test.js test/build-label-augmented-graph.test.js test/layout.test.js
git commit -m "feat: add dummy label nodes to layout"
```

---

### Task 3: Wire `edgeLabels` into the renderer

**Files:**
- Modify: `src/webview-app/mapping/toFlowEdges.js`
- Modify: `src/webview-app/components/edges/NormalReadEdge.jsx`
- Modify: `test/to-flow-edges.test.js`
- Modify: `test/normal-read-edge-component-contract.test.js`

- [ ] **Step 1: Write the failing renderer contract tests**

Append to `test/to-flow-edges.test.js`:

```js
test('passes edge label layout geometry into edge data when layout provides it', () => {
  const edges = toFlowEdges(
    [{ from: 'start', to: 'review', label: '通过' }],
    [{ id: 'start', label: '开始' }, { id: 'review', label: '审批' }],
    {
      nodes: {
        start: { x: 80, y: 120, w: 132, h: 46 },
        review: { x: 280, y: 120, w: 132, h: 46 },
      },
      edgeLabels: {
        'start->review#通过': { x: 180, y: 96, w: 52, h: 24 },
      },
    },
  )

  assert.deepEqual(edges[0].data.labelLayout, { x: 180, y: 96, w: 52, h: 24 })
})
```

Append to `test/normal-read-edge-component-contract.test.js`:

```js
test('normal read edge prefers labelLayout from edge data when present', async () => {
  const source = await readFile('src/webview-app/components/edges/NormalReadEdge.jsx', 'utf8')

  assert.match(source, /labelLayout/)
  assert.match(source, /data\?\.labelLayout/)
  assert.match(source, /labelX=\{/)
  assert.match(source, /labelY=\{/)
})
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run:

```bash
node --test test/to-flow-edges.test.js test/normal-read-edge-component-contract.test.js
```

Expected:
- the new edge-data assertion fails because `labelLayout` is not passed yet
- the component contract fails because `NormalReadEdge.jsx` does not reference `labelLayout`

- [ ] **Step 3: Attach `labelLayout` in `toFlowEdges()`**

Update the `flowEdge.data` object in `src/webview-app/mapping/toFlowEdges.js`:

```js
      data: {
        edgeRef,
        ...(sourceNode ? { sourceNode } : {}),
        ...(targetNode ? { targetNode } : {}),
        ...(layout?.edgeLabels?.[flowEdge.id] ? { labelLayout: layout.edgeLabels[flowEdge.id] } : {}),
      },
```

- [ ] **Step 4: Prefer `labelLayout` in `NormalReadEdge.jsx`**

Inside `NormalReadEdge.jsx`, add:

```js
  const labelLayout = data?.labelLayout
  const resolvedLabelX = labelLayout ? Math.round(labelLayout.x + labelLayout.w / 2) : geometry.label.x
  const resolvedLabelY = labelLayout ? Math.round(labelLayout.y + labelLayout.h / 2) : geometry.label.y
```

Then update the `BaseEdge` props:

```jsx
      labelX={resolvedLabelX}
      labelY={resolvedLabelY}
```

- [ ] **Step 5: Run focused renderer tests and make them pass**

Run:

```bash
node --test test/to-flow-edges.test.js test/normal-read-edge-component-contract.test.js
```

Expected:
- labeled edges carry `labelLayout`
- the edge component contract passes

- [ ] **Step 6: Commit the renderer integration**

```bash
git add src/webview-app/mapping/toFlowEdges.js src/webview-app/components/edges/NormalReadEdge.jsx test/to-flow-edges.test.js test/normal-read-edge-component-contract.test.js
git commit -m "feat: render edge labels from layout geometry"
```

---

### Task 4: Verify on labeled reference graphs and full tests

**Files:**
- Modify: `test/layout.test.js`

- [ ] **Step 1: Add a real labeled-edge regression test**

Append to `test/layout.test.js`:

```js
test('auto-layout keeps labeled edges in the accorda overview graph with stable edge label boxes', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('例图与对比/accorda-full-overview.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  assert.ok(Object.keys(next.edgeLabels).length >= 8)
  assert.ok(next.edgeLabels['user_cmd->event_store#1. 存入事件日志'])
  assert.ok(next.edgeLabels['router->task_entry#复杂任务/读写文件'])
})
```

- [ ] **Step 2: Run layout-focused verification**

Run:

```bash
node --test test/layout.test.js test/edge-label-dimensions.test.js test/build-label-augmented-graph.test.js test/to-flow-edges.test.js test/normal-read-edge-component-contract.test.js
```

Expected:
- all labeled-edge layout and renderer suites pass

- [ ] **Step 3: Run the full repository test suite**

Run:

```bash
npm test
```

Expected:
- all relevant new tests pass
- if the pre-existing `test/custom-editor-registration.test.js` failure persists because it still references `src/extension.cjs`, note that explicitly instead of treating it as a phase-3 regression

- [ ] **Step 4: Commit the reference verification**

```bash
git add test/layout.test.js
git commit -m "test: verify labeled edge layout on reference graph"
```

---

## Self-Review

- Spec coverage:
  - internal dummy nodes only: covered in Tasks 1 and 2
  - `layout.edgeLabels` contract: covered in Tasks 1, 2, and 4
  - renderer consumption of `labelLayout`: covered in Task 3
  - real reference graph coverage: covered in Task 4
- Placeholder scan:
  - no `TODO`, `TBD`, or incomplete placeholders remain
- Type consistency:
  - helper names are consistently `getEdgeLabelDimensions`, `buildLabelAugmentedGraph`, and `toEdgeKey`
  - output field name stays `edgeLabels` across plan steps
