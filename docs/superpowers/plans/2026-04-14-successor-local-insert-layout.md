# Successor Local Insert Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `createSuccessorNode` behave like a whiteboard-style quick add: place the new node next to its parent without triggering full-graph Dagre relayout.

**Architecture:** Keep graph mutation and source persistence unchanged, but replace the current `createSuccessorNode -> autoLayoutCurrentGraph()` host path with a local placement helper that reads the parent box from `documentModel.layout`, derives the new node box from direction plus spacing, and steps along the cross-axis until it finds a free slot. Dagre remains the source of truth for initial load, explicit auto-layout, spacing changes, and fallback when local placement cannot be derived safely.

**Tech Stack:** VS Code custom editor host, plain JavaScript model helpers, React/XYFlow webview sync, Node `node:test`

---

## File Structure

- Create: `src/model/nodeDimensions.js`
  Responsibility: shared node size calculation used by both Dagre layout and successor local placement.
- Create: `src/model/placeSuccessorNode.js`
  Responsibility: compute the local insertion box for a new successor node from current layout, graph direction, and spacing.
- Create: `test/place-successor-node.test.js`
  Responsibility: unit-test LR/TD placement, collision stepping, and fallback signaling.
- Modify: `src/model/layout.js`
  Responsibility: reuse the shared node dimension helper instead of keeping a private copy.
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
  Responsibility: switch `createSuccessorNode` from full auto-layout to local placement with a guarded fallback.
- Modify: `test/layout-spacing-message-contract.test.js`
  Responsibility: lock in that successor insertion no longer auto-layouts.

### Task 1: Add failing tests for shared node dimensions and successor local placement

**Files:**
- Create: `test/place-successor-node.test.js`
- Modify: `test/layout.test.js`
- Modify: `test/layout-spacing-message-contract.test.js`

- [ ] **Step 1: Add a shared node dimension regression test**

Add this test near the sizing assertions in `test/layout.test.js`:

```js
import { getNodeDimensions } from '../src/model/nodeDimensions.js'

test('shared node dimensions stay aligned with dagre layout sizing', () => {
  assert.deepEqual(
    getNodeDimensions({ id: 'start', label: '开始' }),
    { w: 132, h: 46 },
  )
  assert.deepEqual(
    getNodeDimensions({ id: 'decision', label: '需要工具?', type: 'decision' }),
    { w: 132, h: 86 },
  )
})
```

- [ ] **Step 2: Write the failing local placement tests**

Create `test/place-successor-node.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { placeSuccessorNode } from '../src/model/placeSuccessorNode.js'

test('places an LR successor to the right of the parent using spacing-derived gap', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'LR',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'New successor' },
      ],
    },
    {
      nodes: {
        parent: { x: 100, y: 200, w: 132, h: 46 },
      },
    },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.deepEqual(placement, {
    x: 306,
    y: 200,
    w: 132,
    h: 46,
  })
})

test('places a TD successor below the parent using spacing-derived gap', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'TD',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'New successor' },
      ],
    },
    {
      nodes: {
        parent: { x: 100, y: 200, w: 132, h: 46 },
      },
    },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.deepEqual(placement, {
    x: 100,
    y: 320,
    w: 132,
    h: 46,
  })
})

test('steps along the cross-axis until an LR successor slot is free', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'LR',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'occupied', label: 'Occupied' },
        { id: 'child', label: 'New successor' },
      ],
    },
    {
      nodes: {
        parent: { x: 100, y: 200, w: 132, h: 46 },
        occupied: { x: 306, y: 200, w: 132, h: 46 },
      },
    },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.deepEqual(placement, {
    x: 306,
    y: 292,
    w: 132,
    h: 46,
  })
})

test('returns null when the parent has no stored layout box', () => {
  const placement = placeSuccessorNode(
    {
      direction: 'LR',
      nodes: [
        { id: 'parent', label: 'Parent' },
        { id: 'child', label: 'New successor' },
      ],
    },
    { nodes: {} },
    'parent',
    { id: 'child', label: 'New successor' },
    100,
  )

  assert.equal(placement, null)
})
```

- [ ] **Step 3: Add the host contract test for successor insertion**

Add this test to `test/layout-spacing-message-contract.test.js`:

```js
test('createSuccessorNode uses local placement instead of host auto-layout', async () => {
  const source = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')
  const block = source.match(/if \(message\?\.type === 'createSuccessorNode' && message\.nodeId\) \{[\s\S]*?return\n      \}/)?.[0]

  assert.ok(block)
  assert.match(block, /placeSuccessorNode/)
  assert.doesNotMatch(block, /documentModel\.layout\s*=\s*autoLayoutCurrentGraph\(\)/)
})
```

- [ ] **Step 4: Run the focused tests to verify they fail**

Run:

```bash
node --test test/place-successor-node.test.js test/layout.test.js test/layout-spacing-message-contract.test.js
```

Expected:
- `ERR_MODULE_NOT_FOUND` for the new placement helper and shared dimensions helper
- contract test fails because `createSuccessorNode` still calls `autoLayoutCurrentGraph()`

- [ ] **Step 5: Commit the red tests**

```bash
git add test/place-successor-node.test.js test/layout.test.js test/layout-spacing-message-contract.test.js
git commit -m "test: cover successor local insert layout"
```

### Task 2: Extract shared node dimensions and implement the placement helper

**Files:**
- Create: `src/model/nodeDimensions.js`
- Create: `src/model/placeSuccessorNode.js`
- Modify: `src/model/layout.js`
- Test: `test/place-successor-node.test.js`
- Test: `test/layout.test.js`

- [ ] **Step 1: Extract the shared dimension helper**

Create `src/model/nodeDimensions.js`:

```js
const DEFAULT_NODE_WIDTH = 132
const DEFAULT_NODE_HEIGHT = 46
const DECISION_NODE_HEIGHT = 86
const MAX_NODE_WIDTH = 300
const LABEL_CHARACTER_WIDTH = 6.6
const NODE_HORIZONTAL_PADDING = 42

export function getNodeDimensions(node) {
  return {
    w: Math.max(
      DEFAULT_NODE_WIDTH,
      Math.min(MAX_NODE_WIDTH, node.label.length * LABEL_CHARACTER_WIDTH + NODE_HORIZONTAL_PADDING),
    ),
    h: node.type === 'decision' ? DECISION_NODE_HEIGHT : DEFAULT_NODE_HEIGHT,
  }
}
```

- [ ] **Step 2: Update Dagre layout to reuse the helper**

Change the top of `src/model/layout.js` to:

```js
import dagre from 'dagre'

import { getNodeDimensions } from './nodeDimensions.js'
```

Delete the old inline sizing constants and the private `getNodeDimensions()` function, leaving all layout behavior unchanged.

- [ ] **Step 3: Implement successor local placement**

Create `src/model/placeSuccessorNode.js`:

```js
import { getNodeDimensions } from './nodeDimensions.js'
import { toDagreSpacing } from './layout.js'

const COLLISION_MARGIN = 12

export function placeSuccessorNode(graph, layout, parentNodeId, newNode, spacingValue) {
  const parentBox = layout?.nodes?.[parentNodeId]
  if (!parentBox) {
    return null
  }

  const size = getNodeDimensions(newNode)
  const spacing = toDagreSpacing({ spacing: spacingValue })
  const isVertical = graph.direction === 'TD' || graph.direction === 'TB'
  const baseBox = isVertical
    ? {
        x: parentBox.x,
        y: parentBox.y + parentBox.h + spacing.ranksep,
        w: size.w,
        h: size.h,
      }
    : {
        x: parentBox.x + parentBox.w + spacing.ranksep,
        y: parentBox.y,
        w: size.w,
        h: size.h,
      }

  const step = isVertical
    ? spacing.nodesep + size.w
    : spacing.nodesep + size.h

  const occupiedBoxes = Object.entries(layout?.nodes ?? {})
    .filter(([nodeId]) => nodeId !== newNode.id)
    .map(([, box]) => box)

  let candidate = baseBox
  while (occupiedBoxes.some((box) => boxesOverlap(box, candidate))) {
    candidate = isVertical
      ? { ...candidate, x: candidate.x + step }
      : { ...candidate, y: candidate.y + step }
  }

  return candidate
}

function boxesOverlap(left, right) {
  return !(
    left.x + left.w + COLLISION_MARGIN <= right.x ||
    right.x + right.w + COLLISION_MARGIN <= left.x ||
    left.y + left.h + COLLISION_MARGIN <= right.y ||
    right.y + right.h + COLLISION_MARGIN <= left.y
  )
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --test test/place-successor-node.test.js test/layout.test.js
```

Expected:
- all tests pass
- `layout.test.js` still passes all existing Dagre assertions unchanged

- [ ] **Step 5: Commit the helper implementation**

```bash
git add src/model/nodeDimensions.js src/model/placeSuccessorNode.js src/model/layout.js test/place-successor-node.test.js test/layout.test.js
git commit -m "feat: add successor local placement helper"
```

### Task 3: Switch host successor creation to local placement with guarded fallback

**Files:**
- Modify: `src/extension-helpers/resolveCustomFlowEditor.js`
- Test: `test/layout-spacing-message-contract.test.js`

- [ ] **Step 1: Wire the new helper into the extension module loading**

In the module load list near the top of `resolveCustomFlowEditor.js`, add:

```js
{ placeSuccessorNode },
```

and load:

```js
loadModule('./model/placeSuccessorNode.js'),
```

- [ ] **Step 2: Replace successor auto-layout with local placement**

Update the `createSuccessorNode` block to this shape:

```js
documentModel.graph = createSuccessorNode(documentModel.graph, message.nodeId, { id: nodeId, label })

const nextPlacement = placeSuccessorNode(
  documentModel.graph,
  documentModel.layout,
  message.nodeId,
  { id: nodeId, label },
  layoutSpacing,
)

documentModel.layout = nextPlacement
  ? {
      ...documentModel.layout,
      nodes: {
        ...documentModel.layout.nodes,
        [nodeId]: nextPlacement,
      },
    }
  : autoLayoutCurrentGraph()
```

Keep the rest of the block unchanged:
- persist source
- debug log
- `await postSyncState()`

- [ ] **Step 3: Preserve the current boundaries**

Verify in code that:
- `createNode` still uses `autoLayoutCurrentGraph()`
- `setSpacing` still recomputes full layout
- `autoLayout` still recomputes full layout
- initial document load still derives layout from Dagre

No code should be added to persist local placement into `.flow`.

- [ ] **Step 4: Run the focused host tests**

Run:

```bash
node --test test/layout-spacing-message-contract.test.js test/custom-editor-document-sync.test.js test/edit-graph.test.js
```

Expected:
- successor contract test passes
- existing sync/layout tests still pass
- graph mutation tests still pass unchanged

- [ ] **Step 5: Commit the host integration**

```bash
git add src/extension-helpers/resolveCustomFlowEditor.js test/layout-spacing-message-contract.test.js
git commit -m "feat: place successor nodes without relayout"
```

### Task 4: Full verification and manual behavior check

**Files:**
- Modify: none

- [ ] **Step 1: Run the full automated verification**

Run:

```bash
npm test
npm run build
```

Expected:
- `npm test` passes all test files
- `npm run build` completes without bundle errors

- [ ] **Step 2: Manual editor check in VS Code**

Verify these scenarios in the extension host:

```text
1. Add successor in an LR diagram: new node appears to the right; unrelated branches do not move.
2. Add successor in a TD diagram: new node appears below; unrelated branches do not move.
3. Add multiple successors into an occupied area: the new node steps along the cross-axis instead of overlapping.
4. Click "整理布局": Dagre still repacks the graph globally.
5. Close/reopen the document: layout regenerates from Dagre, confirming local insert placement is session-scoped.
```

- [ ] **Step 3: Commit only if manual behavior matches the goal**

```bash
git status --short
```

Expected:
- no unexpected modified files outside the planned paths
- if manual behavior is good, create the final commit for this task batch or squash according to user preference
