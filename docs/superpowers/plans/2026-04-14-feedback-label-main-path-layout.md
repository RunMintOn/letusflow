# Feedback Label and Main Path Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move feedback-edge labels onto their outside lanes and add a lightweight Dagre edge-priority heuristic so forward flow edges influence layout more than feedback/back edges.

**Architecture:** Keep the existing `.flow` DSL, graph model, Dagre layout pass, and XYFlow renderer. Add small pure helpers beside the existing edge-path and layout code; do not introduce FlowDB/LayoutData, nested cluster layout, or a new edge router in this slice.

**Tech Stack:** React, `@xyflow/react`, dagre, Node.js test runner, `node:assert/strict`

---

## Assumptions

- Do not change `.flow` syntax; there is no new `primary` or edge attribute.
- Treat graph declaration order as the first-pass flow-order signal for Dagre edge priority.
- Treat edges from a later-declared node to an earlier-declared node as feedback/back edges for Dagre priority.
- Keep the current feedback-edge outside-lane path shape; only label placement changes.

---

### Task 1: Put feedback-edge labels on the outside lane

**Files:**
- Modify: `src/webview-app/components/edges/feedbackEdgePath.js`
- Modify: `src/webview-app/components/edges/FeedbackEdge.jsx`
- Modify: `test/feedback-edge-path.test.js`

- [ ] **Step 1: Write the failing tests**

Update the import in `test/feedback-edge-path.test.js`:

```js
import {
  toFeedbackEdgeLabelPosition,
  toFeedbackEdgePath,
} from '../src/webview-app/components/edges/feedbackEdgePath.js'
```

Append these tests:

```js
test('places vertical feedback labels on the outside lane', () => {
  const labelPosition = toFeedbackEdgeLabelPosition({
    sourceX: 146,
    sourceY: 606,
    targetX: 186,
    targetY: 120,
    route: {
      direction: 'TD',
      laneX: 32,
      sourceOffset: 24,
      targetOffset: 24,
    },
  })

  assert.deepEqual(labelPosition, { x: 32, y: 363 })
})

test('places horizontal feedback labels on the outside lane', () => {
  const labelPosition = toFeedbackEdgeLabelPosition({
    sourceX: 606,
    sourceY: 146,
    targetX: 120,
    targetY: 186,
    route: {
      direction: 'LR',
      laneY: 32,
      sourceOffset: 24,
      targetOffset: 24,
    },
  })

  assert.deepEqual(labelPosition, { x: 363, y: 32 })
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test test/feedback-edge-path.test.js`

Expected: FAIL with an import/export error because `toFeedbackEdgeLabelPosition` does not exist yet.

- [ ] **Step 3: Add the label-position helper**

In `src/webview-app/components/edges/feedbackEdgePath.js`, keep `toFeedbackEdgePath` unchanged and add:

```js
export function toFeedbackEdgeLabelPosition({ sourceX, sourceY, targetX, targetY, route }) {
  if (route?.direction === 'TD' || route?.direction === 'TB') {
    const sourceExitY = sourceY + route.sourceOffset
    const targetEnterY = targetY - route.targetOffset
    return {
      x: route.laneX,
      y: Math.round((sourceExitY + targetEnterY) / 2),
    }
  }

  const sourceExitX = sourceX + route.sourceOffset
  const targetEnterX = targetX - route.targetOffset
  return {
    x: Math.round((sourceExitX + targetEnterX) / 2),
    y: route.laneY,
  }
}
```

- [ ] **Step 4: Wire the helper into the React edge component**

Update `src/webview-app/components/edges/FeedbackEdge.jsx` to import both helpers:

```js
import {
  toFeedbackEdgeLabelPosition,
  toFeedbackEdgePath,
} from './feedbackEdgePath.js'
```

Inside `FeedbackEdge`, compute the label position after `path`:

```js
const labelPosition = toFeedbackEdgeLabelPosition({
  sourceX,
  sourceY,
  targetX,
  targetY,
  route: data.feedbackRoute,
})
```

Then change the `BaseEdge` label props to:

```jsx
labelX={labelPosition.x}
labelY={labelPosition.y}
```

- [ ] **Step 5: Verify Task 1**

Run: `node --test test/feedback-edge-path.test.js`

Expected: PASS. The existing path-string tests still pass, and the new label-position tests pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/webview-app/components/edges/feedbackEdgePath.js src/webview-app/components/edges/FeedbackEdge.jsx test/feedback-edge-path.test.js
git commit -m "fix: place feedback edge labels on outside lanes"
```

---

### Task 2: Add Dagre edge priority for forward flow

**Files:**
- Modify: `src/model/layout.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing tests**

Update the import in `test/layout.test.js`:

```js
import {
  autoLayoutGraph,
  toDagreEdgePriority,
} from '../src/model/layout.js'
```

Append these tests:

```js
test('dagre edge priority favors edges that follow declaration order', () => {
  const nodeOrder = new Map([
    ['start', 0],
    ['work', 1],
    ['retry', 2],
  ])

  assert.deepEqual(
    toDagreEdgePriority({ from: 'start', to: 'work' }, nodeOrder),
    { weight: 3, minlen: 1 },
  )
})

test('dagre edge priority weakens edges that point back in declaration order', () => {
  const nodeOrder = new Map([
    ['start', 0],
    ['work', 1],
    ['retry', 2],
  ])

  assert.deepEqual(
    toDagreEdgePriority({ from: 'retry', to: 'work' }, nodeOrder),
    { weight: 1, minlen: 1 },
  )
})

test('dagre edge priority stays neutral when an edge references unknown nodes', () => {
  const nodeOrder = new Map([['start', 0]])

  assert.deepEqual(
    toDagreEdgePriority({ from: 'start', to: 'missing' }, nodeOrder),
    { weight: 1, minlen: 1 },
  )
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test test/layout.test.js`

Expected: FAIL with an import/export error because `toDagreEdgePriority` does not exist yet.

- [ ] **Step 3: Add Dagre priority constants and helper**

In `src/model/layout.js`, add these constants near the existing Dagre constants:

```js
const DAGRE_FORWARD_EDGE_WEIGHT = 3
const DAGRE_NEUTRAL_EDGE_WEIGHT = 1
const DAGRE_EDGE_MINLEN = 1
```

Add this exported helper near the bottom of the file:

```js
export function toDagreEdgePriority(edge, nodeOrder) {
  const sourceOrder = nodeOrder.get(edge.from)
  const targetOrder = nodeOrder.get(edge.to)

  if (sourceOrder === undefined || targetOrder === undefined) {
    return {
      weight: DAGRE_NEUTRAL_EDGE_WEIGHT,
      minlen: DAGRE_EDGE_MINLEN,
    }
  }

  return {
    weight: sourceOrder <= targetOrder ? DAGRE_FORWARD_EDGE_WEIGHT : DAGRE_NEUTRAL_EDGE_WEIGHT,
    minlen: DAGRE_EDGE_MINLEN,
  }
}
```

- [ ] **Step 4: Apply the priority helper in `autoLayoutGraph`**

In `src/model/layout.js`, build node order after node registration:

```js
const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))
```

Change the Dagre edge setup to pass the helper output:

```js
graph.edges.forEach((edge, index) => {
  dagreGraph.setEdge(
    edge.from,
    edge.to,
    toDagreEdgePriority(edge, nodeOrder),
    `${edge.from}->${edge.to}#${index}`,
  )
})
```

- [ ] **Step 5: Verify Task 2**

Run: `node --test test/layout.test.js`

Expected: PASS. Existing layout-order tests still pass, and the new edge-priority helper tests pass.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/model/layout.js test/layout.test.js
git commit -m "fix: weight dagre edges by flow direction"
```

---

### Task 3: Full verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: PASS for all `test/*.test.js` files.

- [ ] **Step 2: Run the webview build**

Run: `npm run build`

Expected: PASS and `dist/webview/` is regenerated by the build. Do not hand-edit files under `dist/`.

- [ ] **Step 3: Manual visual check**

Open the extension preview and inspect a graph with feedback edges, such as a retry loop.

Expected:

- Feedback-edge labels sit on the outside lane instead of floating between source and target nodes.
- Existing feedback paths still route outside the graph.
- Main forward flows remain ordered in `LR` and `TD` diagrams.
- No `.flow` syntax changes are required.

