# Mermaid-Like Post-Layout Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mermaid-like post-layout pass after Dagre so same-rank nodes read more naturally, main-flow nodes get easier-to-scan placement, and grouped diagrams gain local cleanup without letting groups dominate layout.

**Architecture:** Keep `autoLayoutGraph()` and Dagre as the first stage. Add a model-layer post-layout pass that derives a lightweight primary-flow score, groups nodes into ranks from Dagre output, reorders same-rank nodes with a stable rule set, and then applies weak group-aware nudges. Do not change the `.flow` parser, host/webview sync protocol, or XYFlow mapping contract.

**Tech Stack:** dagre, plain JavaScript model helpers, Node `node:test`

---

## File Structure

- Create: `src/model/derivePrimaryFlow.js`
  Responsibility: assign a stable, lightweight priority score to nodes so rank ordering can favor main-flow nodes before falling back to source order.
- Create: `src/model/postLayoutRanks.js`
  Responsibility: group Dagre output into ranks, reorder nodes within each rank, and redistribute cross-axis positions without changing primary-axis layering.
- Create: `src/model/applyGroupMargins.js`
  Responsibility: nudge grouped nodes locally after rank reordering so same-group nodes stay more compact without overriding main-flow ordering.
- Modify: `src/model/layout.js`
  Responsibility: keep Dagre as the first stage, then invoke `derivePrimaryFlow()`, `postLayoutRanks()`, and `applyGroupMargins()` before returning the final layout.
- Create: `test/derive-primary-flow.test.js`
  Responsibility: lock the lightweight main-flow scoring rules.
- Create: `test/post-layout-ranks.test.js`
  Responsibility: lock rank grouping tolerance, LR/TD same-rank ordering, and cross-axis redistribution.
- Create: `test/apply-group-margins.test.js`
  Responsibility: lock weak group nudging behavior and ensure ungrouped nodes are not moved.
- Modify: `test/layout.test.js`
  Responsibility: cover end-to-end post-layout behavior on small graphs and one real reference graph.

---

### Task 1: Add failing tests for post-layout ordering

**Files:**
- Create: `test/derive-primary-flow.test.js`
- Create: `test/post-layout-ranks.test.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing `derivePrimaryFlow()` tests**

Create `test/derive-primary-flow.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { derivePrimaryFlow } from '../src/model/derivePrimaryFlow.js'

test('prioritizes forward main-flow nodes over back-edge targets', () => {
  const scores = derivePrimaryFlow({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'revise', label: '补充信息' },
      { id: 'done', label: '完成' },
    ],
    edges: [
      { from: 'start', to: 'review' },
      { from: 'review', to: 'done' },
      { from: 'review', to: 'revise' },
      { from: 'revise', to: 'review' },
    ],
  })

  assert.ok(scores.review > scores.revise)
  assert.ok(scores.done >= scores.revise)
})

test('keeps source-order tie breaking stable when nodes have similar topology', () => {
  const scores = derivePrimaryFlow({
    direction: 'TD',
    nodes: [
      { id: 'B', label: 'B' },
      { id: 'A', label: 'A' },
      { id: 'C', label: 'C' },
    ],
    edges: [],
  })

  assert.deepEqual(Object.keys(scores), ['B', 'A', 'C'])
  assert.equal(scores.B, scores.A)
  assert.equal(scores.A, scores.C)
})
```

- [ ] **Step 2: Write the failing `postLayoutRanks()` tests**

Create `test/post-layout-ranks.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { postLayoutRanks } from '../src/model/postLayoutRanks.js'

test('reorders LR same-rank nodes by primary-flow score before source order', () => {
  const next = postLayoutRanks(
    {
      direction: 'LR',
      nodes: [
        { id: 'start', label: '开始' },
        { id: 'D2', label: 'Decision 2' },
        { id: 'D1', label: 'Decision 1' },
        { id: 'D3', label: 'Decision 3' },
      ],
    },
    {
      nodes: {
        start: { x: 40, y: 120, w: 132, h: 46 },
        D2: { x: 280, y: 320, w: 132, h: 46 },
        D1: { x: 282, y: 120, w: 132, h: 46 },
        D3: { x: 279, y: 220, w: 132, h: 46 },
      },
    },
    { ranksep: 64, nodesep: 34 },
    { start: 5, D2: 3, D1: 4, D3: 2 },
  )

  assert.ok(next.nodes.D1.y < next.nodes.D2.y)
  assert.ok(next.nodes.D2.y < next.nodes.D3.y)
  assert.equal(next.nodes.D1.x, next.nodes.D2.x)
})

test('reorders TD same-rank nodes across the x axis only', () => {
  const next = postLayoutRanks(
    {
      direction: 'TD',
      nodes: [
        { id: 'start', label: '开始' },
        { id: 'B', label: 'B' },
        { id: 'A', label: 'A' },
        { id: 'C', label: 'C' },
      ],
    },
    {
      nodes: {
        start: { x: 120, y: 40, w: 132, h: 46 },
        B: { x: 260, y: 260, w: 132, h: 46 },
        A: { x: 80, y: 262, w: 132, h: 46 },
        C: { x: 420, y: 259, w: 132, h: 46 },
      },
    },
    { ranksep: 64, nodesep: 34 },
    { start: 5, B: 3, A: 4, C: 2 },
  )

  assert.ok(next.nodes.A.x < next.nodes.B.x)
  assert.ok(next.nodes.B.x < next.nodes.C.x)
  assert.equal(next.nodes.A.y, next.nodes.B.y)
})

test('uses a rank tolerance so near-identical primary-axis values stay in one rank', () => {
  const next = postLayoutRanks(
    {
      direction: 'LR',
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
    },
    {
      nodes: {
        A: { x: 400, y: 100, w: 132, h: 46 },
        B: { x: 404, y: 220, w: 132, h: 46 },
      },
    },
    { ranksep: 64, nodesep: 34 },
    { A: 1, B: 0 },
  )

  assert.ok(Math.abs(next.nodes.A.x - next.nodes.B.x) <= 4)
})
```

- [ ] **Step 3: Extend end-to-end layout tests**

Append to `test/layout.test.js`:

```js
test('auto-layout reorders LR same-rank siblings into a more readable main-flow order', () => {
  const next = autoLayoutGraph({
    direction: 'LR',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'review', label: '审批' },
      { id: 'revise', label: '补充信息' },
      { id: 'done', label: '完成' },
      { id: 'archive', label: '归档' },
    ],
    edges: [
      { from: 'start', to: 'review' },
      { from: 'review', to: 'done' },
      { from: 'review', to: 'revise' },
      { from: 'done', to: 'archive' },
      { from: 'revise', to: 'review' },
    ],
  })

  assert.ok(next.nodes.review.x < next.nodes.done.x)
  assert.ok(next.nodes.done.y < next.nodes.revise.y)
})

test('auto-layout reorders TD same-rank siblings without breaking vertical layering', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'task', label: '任务模式' },
      { id: 'reply', label: '直接响应' },
      { id: 'clarify', label: '追问澄清' },
    ],
    edges: [
      { from: 'start', to: 'task' },
      { from: 'start', to: 'reply' },
      { from: 'start', to: 'clarify' },
    ],
  })

  assert.equal(next.nodes.task.y, next.nodes.reply.y)
  assert.ok(next.nodes.task.x < next.nodes.reply.x)
  assert.ok(next.nodes.reply.x < next.nodes.clarify.x)
})
```

- [ ] **Step 4: Run focused tests to verify they fail**

Run:

```bash
node --test test/derive-primary-flow.test.js test/post-layout-ranks.test.js test/layout.test.js
```

Expected:
- `ERR_MODULE_NOT_FOUND` for the new helpers
- new `layout.test.js` assertions fail because `autoLayoutGraph()` still returns raw Dagre placement

- [ ] **Step 5: Commit the red tests**

```bash
git add test/derive-primary-flow.test.js test/post-layout-ranks.test.js test/layout.test.js
git commit -m "test: cover post-layout rank ordering"
```

---

### Task 2: Implement primary-flow scoring and rank post-processing

**Files:**
- Create: `src/model/derivePrimaryFlow.js`
- Create: `src/model/postLayoutRanks.js`
- Modify: `src/model/layout.js`
- Test: `test/derive-primary-flow.test.js`
- Test: `test/post-layout-ranks.test.js`
- Test: `test/layout.test.js`

- [ ] **Step 1: Implement `derivePrimaryFlow()`**

Create `src/model/derivePrimaryFlow.js`:

```js
export function derivePrimaryFlow(graph) {
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const incoming = new Map(graph.nodes.map((node) => [node.id, []]))
  const outgoing = new Map(graph.nodes.map((node) => [node.id, []]))

  for (const edge of graph.edges) {
    incoming.get(edge.to)?.push(edge)
    outgoing.get(edge.from)?.push(edge)
  }

  const scores = {}
  for (const node of graph.nodes) {
    const incomingEdges = incoming.get(node.id) ?? []
    const outgoingEdges = outgoing.get(node.id) ?? []

    let score = 0
    score += outgoingEdges.filter((edge) => isForwardEdge(edge, nodeOrder)).length * 3
    score += incomingEdges.filter((edge) => isForwardEdge(edge, nodeOrder)).length * 2
    score -= incomingEdges.filter((edge) => !isForwardEdge(edge, nodeOrder)).length * 2
    score -= outgoingEdges.filter((edge) => !isForwardEdge(edge, nodeOrder)).length

    scores[node.id] = score
  }

  return scores
}

function isForwardEdge(edge, nodeOrder) {
  return (nodeOrder.get(edge.from) ?? -1) <= (nodeOrder.get(edge.to) ?? -1)
}
```

- [ ] **Step 2: Implement `postLayoutRanks()`**

Create `src/model/postLayoutRanks.js`:

```js
export function postLayoutRanks(graph, layout, spacing, primaryFlowScores) {
  const isVertical = graph.direction === 'TD' || graph.direction === 'TB'
  const primaryAxis = isVertical ? 'y' : 'x'
  const crossAxis = isVertical ? 'x' : 'y'
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const rankTolerance = Math.max(8, Math.round(spacing.ranksep * 0.25))
  const ranks = []
  const nextLayout = {
    nodes: Object.fromEntries(
      Object.entries(layout.nodes).map(([nodeId, box]) => [nodeId, { ...box }]),
    ),
  }

  for (const node of graph.nodes) {
    const box = nextLayout.nodes[node.id]
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

  for (const rank of ranks) {
    const orderedIds = [...rank.nodeIds].sort((leftId, rightId) => {
      const leftScore = primaryFlowScores[leftId] ?? 0
      const rightScore = primaryFlowScores[rightId] ?? 0

      if (leftScore !== rightScore) {
        return rightScore - leftScore
      }

      return (nodeOrder.get(leftId) ?? 0) - (nodeOrder.get(rightId) ?? 0)
    })

    const baseline = orderedIds
      .map((nodeId) => nextLayout.nodes[nodeId]?.[crossAxis] ?? 0)
      .sort((left, right) => left - right)[0] ?? 0

    let cursor = baseline
    for (const nodeId of orderedIds) {
      const box = nextLayout.nodes[nodeId]
      box[crossAxis] = cursor
      cursor += (isVertical ? box.w : box.h) + spacing.nodesep
    }
  }

  return nextLayout
}
```

- [ ] **Step 3: Integrate both helpers into `autoLayoutGraph()`**

Update `src/model/layout.js` imports:

```js
import dagre from 'dagre'
import { derivePrimaryFlow } from './derivePrimaryFlow.js'
import { getNodeDimensions } from './nodeDimensions.js'
import { postLayoutRanks } from './postLayoutRanks.js'
```

Replace the return tail in `autoLayoutGraph()` with:

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

  const primaryFlowScores = derivePrimaryFlow(graph)

  return postLayoutRanks(graph, layout, spacing, primaryFlowScores)
```

- [ ] **Step 4: Run focused tests and make them pass**

Run:

```bash
node --test test/derive-primary-flow.test.js test/post-layout-ranks.test.js test/layout.test.js
```

Expected:
- the new helper suites pass
- existing `layout.test.js` coverage stays green

- [ ] **Step 5: Commit the green rank-ordering implementation**

```bash
git add src/model/derivePrimaryFlow.js src/model/postLayoutRanks.js src/model/layout.js test/derive-primary-flow.test.js test/post-layout-ranks.test.js test/layout.test.js
git commit -m "feat: add mermaid-like post-layout rank ordering"
```

---

### Task 3: Add weak group-aware local cleanup

**Files:**
- Create: `src/model/applyGroupMargins.js`
- Modify: `src/model/layout.js`
- Create: `test/apply-group-margins.test.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing group-aware tests**

Create `test/apply-group-margins.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { applyGroupMargins } from '../src/model/applyGroupMargins.js'

test('nudges grouped siblings toward each other without moving unrelated nodes', () => {
  const next = applyGroupMargins(
    {
      direction: 'LR',
      groups: [{ id: 'stage2', label: 'Stage 2' }],
      nodes: [
        { id: 'task_entry', label: '任务模式', groupId: 'stage2' },
        { id: 'planner', label: '执行规划', groupId: 'stage2' },
        { id: 'tool_exec', label: '工具执行器', groupId: 'stage2' },
        { id: 'ui_display', label: '终端界面显示' },
      ],
    },
    {
      nodes: {
        task_entry: { x: 400, y: 60, w: 132, h: 46 },
        planner: { x: 400, y: 260, w: 132, h: 46 },
        tool_exec: { x: 400, y: 460, w: 132, h: 46 },
        ui_display: { x: 720, y: 300, w: 132, h: 46 },
      },
    },
  )

  assert.ok(next.nodes.planner.y < 260)
  assert.equal(next.nodes.ui_display.y, 300)
})

test('returns the original layout when the graph has no groups', () => {
  const layout = {
    nodes: {
      start: { x: 40, y: 120, w: 132, h: 46 },
    },
  }

  assert.deepEqual(
    applyGroupMargins({ direction: 'LR', groups: [], nodes: [{ id: 'start', label: '开始' }] }, layout),
    layout,
  )
})
```

Append to `test/layout.test.js`:

```js
test('auto-layout keeps grouped stage-2 nodes visually tighter without changing main layering', () => {
  const next = autoLayoutGraph({
    direction: 'TD',
    groups: [{ id: 'stage2', label: 'Stage 2' }],
    nodes: [
      { id: 'start', label: '开始' },
      { id: 'task_entry', label: '任务模式', groupId: 'stage2' },
      { id: 'planner', label: '执行规划', groupId: 'stage2' },
      { id: 'tool_exec', label: '工具执行器', groupId: 'stage2' },
    ],
    edges: [
      { from: 'start', to: 'task_entry' },
      { from: 'task_entry', to: 'planner' },
      { from: 'planner', to: 'tool_exec' },
    ],
  })

  assert.ok(next.nodes.start.y < next.nodes.task_entry.y)
  assert.ok(next.nodes.task_entry.x <= next.nodes.planner.x)
})
```

- [ ] **Step 2: Run tests to verify the new group-aware coverage fails**

Run:

```bash
node --test test/apply-group-margins.test.js test/layout.test.js
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `applyGroupMargins.js`
- new grouped-layout assertions fail because no group-aware cleanup runs yet

- [ ] **Step 3: Implement weak group-aware cleanup**

Create `src/model/applyGroupMargins.js`:

```js
export function applyGroupMargins(graph, layout) {
  if (!(graph.groups?.length)) {
    return layout
  }

  const nextLayout = {
    nodes: Object.fromEntries(
      Object.entries(layout.nodes).map(([nodeId, box]) => [nodeId, { ...box }]),
    ),
  }

  for (const group of graph.groups) {
    const members = graph.nodes
      .filter((node) => node.groupId === group.id)
      .map((node) => ({ node, box: nextLayout.nodes[node.id] }))
      .filter((entry) => entry.box)

    if (members.length < 2) {
      continue
    }

    const averageX = Math.round(members.reduce((sum, entry) => sum + entry.box.x, 0) / members.length)
    const averageY = Math.round(members.reduce((sum, entry) => sum + entry.box.y, 0) / members.length)
    const isVertical = graph.direction === 'TD' || graph.direction === 'TB'

    for (const { box } of members) {
      if (isVertical) {
        box.x = Math.round((box.x + averageX) / 2)
      } else {
        box.y = Math.round((box.y + averageY) / 2)
      }
    }
  }

  return nextLayout
}
```

- [ ] **Step 4: Integrate group cleanup after rank post-layout**

Update `src/model/layout.js` imports:

```js
import { applyGroupMargins } from './applyGroupMargins.js'
```

Replace the current return statement with:

```js
  const primaryFlowScores = derivePrimaryFlow(graph)
  const postLayout = postLayoutRanks(graph, layout, spacing, primaryFlowScores)

  return applyGroupMargins(graph, postLayout)
```

- [ ] **Step 5: Run the focused tests and make them pass**

Run:

```bash
node --test test/apply-group-margins.test.js test/derive-primary-flow.test.js test/post-layout-ranks.test.js test/layout.test.js
```

Expected:
- grouped and ungrouped behavior passes
- previous post-layout tests remain green

- [ ] **Step 6: Commit the weak group-aware cleanup**

```bash
git add src/model/applyGroupMargins.js src/model/layout.js test/apply-group-margins.test.js test/layout.test.js
git commit -m "feat: add weak group-aware post-layout cleanup"
```

---

### Task 4: Verify against real diagram references

**Files:**
- Modify: `test/layout.test.js`

- [ ] **Step 1: Add a real-diagram readability regression test**

Append to `test/layout.test.js`:

```js
test('auto-layout keeps the accorda overview graph horizontally readable after post-layout', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('例图与对比/accorda-full-overview.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  const stage2 = ['task_entry', 'planner', 'tool_exec'].map((id) => next.nodes[id]).filter(Boolean)
  const stage2Xs = stage2.map((box) => box.x)
  const stage2Ys = stage2.map((box) => box.y)

  assert.ok(Math.max(...stage2Xs) - Math.min(...stage2Xs) <= 420)
  assert.ok(Math.max(...stage2Ys) - Math.min(...stage2Ys) <= 520)
})
```

- [ ] **Step 2: Run the full layout-related verification**

Run:

```bash
node --test test/layout.test.js test/derive-primary-flow.test.js test/post-layout-ranks.test.js test/apply-group-margins.test.js
```

Expected:
- all layout-related suites pass

- [ ] **Step 3: Run the repository test suite**

Run:

```bash
npm test
```

Expected:
- all test files pass

- [ ] **Step 4: Commit the reference-graph verification**

```bash
git add test/layout.test.js
git commit -m "test: verify post-layout readability on reference graph"
```

---

## Self-Review

- Spec coverage:
  - Dagre-first architecture: covered in Task 2 integration
  - rank/order post-layout: covered in Tasks 1 and 2
  - weak group participation: covered in Task 3
  - reference-graph validation: covered in Task 4
- Placeholder scan:
  - no `TODO`, `TBD`, or “similar to above” placeholders remain
- Type consistency:
  - helper names are consistently `derivePrimaryFlow`, `postLayoutRanks`, and `applyGroupMargins`
