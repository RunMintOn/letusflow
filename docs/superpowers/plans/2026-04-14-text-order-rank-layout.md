# Text-Order Rank Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `autoLayoutGraph()` preserve `.flow` text declaration order within each Dagre rank, while keeping Dagre responsible for rank assignment and overall layering.

**Architecture:** Keep the existing Dagre pass as the first stage of layout, then add a post-processing pass in `layout.js` that groups nodes into ranks from the primary-axis geometry, sorts each rank by `graph.nodes` declaration order, and rewrites only the cross-axis positions using current spacing. This changes layout semantics without touching the DSL, host-webview contracts, or persistence format.

**Tech Stack:** Dagre, plain JavaScript model helpers, Node `node:test`

---

## File Structure

- Create: `src/model/reorderLayoutRanks.js`
  Responsibility: group Dagre output into ranks, sort nodes within each rank by declaration order, and reassign cross-axis coordinates deterministically.
- Create: `test/reorder-layout-ranks.test.js`
  Responsibility: unit-test rank grouping tolerance, LR/TD rank ordering, and cross-axis coordinate redistribution.
- Modify: `src/model/layout.js`
  Responsibility: run the new post-processing pass after Dagre and expose any small helpers needed by tests.
- Modify: `test/layout.test.js`
  Responsibility: lock in the new “same-rank follows text order” semantics on real layout outputs.

### Task 1: Add failing tests for rank grouping and text-order preservation

**Files:**
- Create: `test/reorder-layout-ranks.test.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing rank reorder helper tests**

Create `test/reorder-layout-ranks.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { reorderLayoutRanks } from '../src/model/reorderLayoutRanks.js'

test('reorders LR rank siblings by node declaration order', () => {
  const layout = reorderLayoutRanks(
    {
      direction: 'LR',
      nodes: [
        { id: 'D1', label: 'D1' },
        { id: 'D2', label: 'D2' },
        { id: 'D3', label: 'D3' },
      ],
    },
    {
      nodes: {
        D1: { x: 400, y: 220, w: 132, h: 46 },
        D2: { x: 400, y: 120, w: 132, h: 46 },
        D3: { x: 400, y: 320, w: 132, h: 46 },
      },
    },
    { ranksep: 74, nodesep: 46 },
  )

  assert.deepEqual(
    ['D1', 'D2', 'D3'].map((id) => layout.nodes[id].y),
    [120, 212, 304],
  )
})

test('reorders TD rank siblings by node declaration order', () => {
  const layout = reorderLayoutRanks(
    {
      direction: 'TD',
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
      ],
    },
    {
      nodes: {
        A: { x: 240, y: 300, w: 132, h: 46 },
        B: { x: 80, y: 300, w: 132, h: 46 },
        C: { x: 400, y: 300, w: 132, h: 46 },
      },
    },
    { ranksep: 74, nodesep: 46 },
  )

  assert.deepEqual(
    ['A', 'B', 'C'].map((id) => layout.nodes[id].x),
    [80, 258, 436],
  )
})

test('groups nearly-equal primary-axis positions into the same rank', () => {
  const layout = reorderLayoutRanks(
    {
      direction: 'LR',
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
    },
    {
      nodes: {
        A: { x: 400, y: 200, w: 132, h: 46 },
        B: { x: 404, y: 100, w: 132, h: 46 },
      },
    },
    { ranksep: 74, nodesep: 46 },
  )

  assert.ok(layout.nodes.A.x === layout.nodes.B.x || Math.abs(layout.nodes.A.x - layout.nodes.B.x) <= 4)
  assert.ok(layout.nodes.A.y > layout.nodes.B.y)
})
```

- [ ] **Step 2: Add failing end-to-end layout semantics tests**

Append these tests to `test/layout.test.js`:

```js
test('auto-layout preserves text order within the same LR rank', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'D2', label: 'Decision 2' },
      { id: 'D1', label: 'Decision 1' },
      { id: 'D3', label: 'Decision 3' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'D2' },
      { from: 'start', to: 'D1' },
      { from: 'start', to: 'D3' },
      { from: 'D2', to: 'done' },
      { from: 'D1', to: 'done' },
      { from: 'D3', to: 'done' },
    ],
  })

  assert.ok(next.nodes.D2.y < next.nodes.D1.y)
  assert.ok(next.nodes.D1.y < next.nodes.D3.y)
})

test('auto-layout preserves text order within the same TD rank', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'B', label: 'B' },
      { id: 'A', label: 'A' },
      { id: 'C', label: 'C' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'B' },
      { from: 'start', to: 'A' },
      { from: 'start', to: 'C' },
      { from: 'B', to: 'done' },
      { from: 'A', to: 'done' },
      { from: 'C', to: 'done' },
    ],
  })

  assert.ok(next.nodes.B.x < next.nodes.A.x)
  assert.ok(next.nodes.A.x < next.nodes.C.x)
})
```

- [ ] **Step 3: Run focused tests to verify they fail**

Run:

```bash
node --test test/reorder-layout-ranks.test.js test/layout.test.js
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `reorderLayoutRanks.js`
- new `layout.test.js` cases fail because current Dagre-only output does not guarantee text-order preservation within a rank

- [ ] **Step 4: Commit the red tests**

```bash
git add test/reorder-layout-ranks.test.js test/layout.test.js
git commit -m "test: cover text-order rank layout"
```

### Task 2: Implement rank grouping and rank-internal reordering

**Files:**
- Create: `src/model/reorderLayoutRanks.js`
- Modify: `src/model/layout.js`
- Test: `test/reorder-layout-ranks.test.js`

- [ ] **Step 1: Implement the rank reorder helper**

Create `src/model/reorderLayoutRanks.js`:

```js
export function reorderLayoutRanks(graph, layout, spacing) {
  const direction = graph.direction === 'TB' || graph.direction === 'TD' ? 'TD' : 'LR'
  const isVertical = direction === 'TD'
  const primaryAxis = isVertical ? 'y' : 'x'
  const crossAxis = isVertical ? 'x' : 'y'
  const rankTolerance = Math.max(8, Math.round(spacing.ranksep * 0.25))
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const ranks = []

  for (const node of graph.nodes) {
    const box = layout.nodes[node.id]
    if (!box) {
      continue
    }

    const axisValue = box[primaryAxis]
    let rank = ranks.find((entry) => Math.abs(entry.axisValue - axisValue) <= rankTolerance)
    if (!rank) {
      rank = { axisValue, nodeIds: [] }
      ranks.push(rank)
    }
    rank.nodeIds.push(node.id)
  }

  const nextLayout = {
    nodes: Object.fromEntries(
      Object.entries(layout.nodes).map(([nodeId, box]) => [nodeId, { ...box }]),
    ),
  }

  for (const rank of ranks) {
    const orderedIds = [...rank.nodeIds].sort((leftId, rightId) => nodeOrder.get(leftId) - nodeOrder.get(rightId))
    const currentBoxes = orderedIds
      .map((nodeId) => nextLayout.nodes[nodeId])
      .sort((leftBox, rightBox) => leftBox[crossAxis] - rightBox[crossAxis])

    let cursor = currentBoxes[0]?.[crossAxis] ?? 0
    for (const nodeId of orderedIds) {
      const box = nextLayout.nodes[nodeId]
      box[crossAxis] = cursor
      cursor += box[isVertical ? 'w' : 'h'] + spacing.nodesep
    }
  }

  return nextLayout
}
```

- [ ] **Step 2: Integrate the helper into `autoLayoutGraph()`**

Update `src/model/layout.js`:

```js
import dagre from 'dagre'
import { getNodeDimensions } from './nodeDimensions.js'
import { reorderLayoutRanks } from './reorderLayoutRanks.js'
```

Then replace the current return path in `autoLayoutGraph()`:

```js
  const layout = { nodes: {} }

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

  return reorderLayoutRanks(graph, layout, spacing)
```

- [ ] **Step 3: Run focused tests to verify they pass**

Run:

```bash
node --test test/reorder-layout-ranks.test.js test/layout.test.js
```

Expected:
- helper tests pass
- new same-rank ordering tests pass
- existing layout sizing and spacing tests remain green

- [ ] **Step 4: Commit the layout implementation**

```bash
git add src/model/reorderLayoutRanks.js src/model/layout.js test/reorder-layout-ranks.test.js test/layout.test.js
git commit -m "feat: preserve text order within layout ranks"
```

### Task 3: Add regression coverage for the complex runtime shape

**Files:**
- Modify: `test/layout.test.js`

- [ ] **Step 1: Add a regression that guards against same-rank branch scrambling**

Append this test to `test/layout.test.js`:

```js
test('auto-layout keeps complex runtime decision siblings in text order', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('例图与对比/complex-runtime.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  assert.ok(next.nodes.D1.y < next.nodes.D2.y)
  assert.ok(next.nodes.D2.y < next.nodes.D3.y)
  assert.ok(next.nodes.D3.y < next.nodes.D4.y)
})
```

- [ ] **Step 2: Run the targeted regression test**

Run:

```bash
node --test test/layout.test.js
```

Expected:
- complex runtime regression passes alongside prior layout tests

- [ ] **Step 3: Commit the regression guard**

```bash
git add test/layout.test.js
git commit -m "test: lock text-order layout on complex runtime graph"
```

### Task 4: Full verification

**Files:**
- Modify: none

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected:
- all `node:test` suites pass

- [ ] **Step 2: Rebuild the webview bundle**

Run:

```bash
npm run build
```

Expected:
- esbuild completes successfully

- [ ] **Step 3: Manual editor verification**

Verify in the extension host:

```text
1. Reorder same-rank node declarations in a simple LR graph and click "整理布局": vertical order follows the text.
2. Reorder same-rank node declarations in a TD graph and click "整理布局": horizontal order follows the text.
3. Open 例图与对比/complex-runtime.flow, reorder a same-rank branch block in text, and click "整理布局": same-rank siblings follow the edited text order without splitting into a surprising local order.
4. Confirm createSuccessorNode local placement still behaves as before until "整理布局" is clicked.
```

- [ ] **Step 4: Inspect the diff before handoff**

Run:

```bash
git status --short
git diff -- src/model/layout.js src/model/reorderLayoutRanks.js test/reorder-layout-ranks.test.js test/layout.test.js
```

Expected:
- only the planned layout/model/test files are modified
- no unrelated docs, examples, or generated output are included
