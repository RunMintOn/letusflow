# Mermaid-like Read Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `complex-runtime.flow` render close to the Mermaid reference in readability: compact TD layout, visible group structure, quiet directional edges, and less editor chrome.

**Architecture:** Keep `.flow` as the source of truth and keep XYFlow as the canvas. Do not introduce Mermaid-compatible FlowDB, full Mermaid parsing, edge-crossing optimization, or full label avoidance in this phase; this is a read-mode polish pass over dagre layout defaults, group/node styling, edge props, and ReactFlow chrome.

**Tech Stack:** React, `@xyflow/react`, dagre, CSS, Node.js test runner, `node:assert`

---

## Execution Order

Implement in this order because the Mermaid rendering-chain review showed layout and group structure matter more than surface styling:

1. Tune dagre density for the complex TD reference.
2. Make group and node visuals closer to Mermaid.
3. Make edges quieter and more directional.
4. Switch ReactFlow chrome to read-first defaults.
5. Document the visual acceptance checklist.

---

### Task 1: Tune dagre density for the Mermaid reference graph

**Files:**
- Modify: `src/model/layout.js`
- Modify: `test/layout.test.js`

- [ ] **Step 1: Write the failing test**

Append this test to `test/layout.test.js`:

```js
test('auto-layout keeps the complex runtime graph within a readable TD footprint', async () => {
  const { readFile } = await import('node:fs/promises')
  const { parseDiagram } = await import('../src/model/parseDiagram.js')

  const graph = parseDiagram(await readFile('complex-runtime.flow', 'utf8'))
  const next = autoLayoutGraph(graph)

  const boxes = Object.values(next.nodes)
  const minX = Math.min(...boxes.map((box) => box.x))
  const minY = Math.min(...boxes.map((box) => box.y))
  const maxX = Math.max(...boxes.map((box) => box.x + box.w))
  const maxY = Math.max(...boxes.map((box) => box.y + box.h))

  assert.ok(maxX - minX <= 2200)
  assert.ok(maxY - minY <= 3000)
  assert.ok(maxY > minY)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL on the current implementation because `complex-runtime.flow` is about `1532 x 3176`, so height exceeds the `3000` target.

- [ ] **Step 3: Tighten layout constants**

In `src/model/layout.js`, change the constants to:

```js
const DEFAULT_NODE_WIDTH = 132
const DEFAULT_NODE_HEIGHT = 46
const MAX_NODE_WIDTH = 300
const LABEL_CHARACTER_WIDTH = 6.6
const NODE_HORIZONTAL_PADDING = 42
const DAGRE_RANK_SEP = 74
const DAGRE_NODE_SEP = 46
const DAGRE_MARGIN = 48
```

- [ ] **Step 4: Update existing layout assertions**

In the first layout test in `test/layout.test.js`, update the spacing and height assertions to match the new constants while preserving ordering intent:

```js
assert.ok(next.nodes.review.x - next.nodes.start.x >= 40)
assert.ok(next.nodes.done.x - next.nodes.review.x >= 40)
assert.equal(next.nodes.start.h, 46)
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run build`
Expected: PASS. Visual check: `complex-runtime.flow` is less vertically sprawling and still keeps top-to-bottom ordering.

- [ ] **Step 6: Commit**

```bash
git add src/model/layout.js test/layout.test.js
git commit -m "style: tune dagre layout density"
```

### Task 2: Make groups and nodes visually closer to Mermaid

**Files:**
- Modify: `src/webview-app/mapping/toFlowNodes.js`
- Modify: `src/webview-app/index.css`
- Modify: `test/to-flow-nodes.test.js`

- [ ] **Step 1: Write the failing test**

Append this test to `test/to-flow-nodes.test.js`:

```js
test('diagram nodes carry read-mode classes for Mermaid-like styling', () => {
  const nodes = toFlowNodes(
    {
      groups: [{ id: 'prompt', label: 'Prompt Assembly' }],
      nodes: [{ id: 'A1', label: 'A1 identity system prompt', groupId: 'prompt' }],
    },
    { nodes: { A1: { x: 80, y: 120, w: 180, h: 46 } } },
  )

  assert.equal(nodes[0].className, 'diagram-flow-group')
  assert.equal(nodes[1].className, 'diagram-flow-node')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `toFlowNodes` does not set `className` on diagram or group nodes yet.

- [ ] **Step 3: Add class names**

In `src/webview-app/mapping/toFlowNodes.js`, add this property to diagram node objects:

```js
className: 'diagram-flow-node',
```

Add this property to group node objects:

```js
className: 'diagram-flow-group',
```

Update existing deep-equality assertions in `test/to-flow-nodes.test.js` so expected diagram nodes include:

```js
className: 'diagram-flow-node',
```

Update the existing group test to assert:

```js
assert.equal(nodes[0].className, 'diagram-flow-group')
```

- [ ] **Step 4: Replace heavy card styling**

In `src/webview-app/index.css`, update the relevant existing rules to:

```css
:root {
  color-scheme: light;
  --bg: #f8f8f4;
  --panel: #ffffff;
  --ink: #33333a;
  --muted-ink: #6b6b76;
  --node-fill: #f7f5ff;
  --node-stroke: #c7bdf7;
  --node-stroke-strong: #9e8ef1;
  --edge: #6f6f78;
  --group-fill: rgba(255, 250, 205, 0.42);
  --group-stroke: rgba(201, 191, 85, 0.58);
  --border: rgba(60, 60, 68, 0.14);
}

body {
  font-family: "Aptos", "Segoe UI", ui-sans-serif, sans-serif;
  color: var(--ink);
  background: var(--bg);
}

.flow-canvas {
  min-height: calc(100vh - 73px);
  background: #f8f8f4;
}

.flow-background {
  opacity: 0.18;
}

.diagram-node {
  position: relative;
  min-width: 132px;
  min-height: 46px;
  display: grid;
  place-items: center;
  border-radius: 0;
  border: 1.4px solid var(--node-stroke);
  background: var(--node-fill);
  box-sizing: border-box;
  box-shadow: none;
}

.diagram-node__label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--ink);
  max-width: 100%;
  padding: 0 12px;
  text-align: center;
  overflow-wrap: anywhere;
}

.react-flow__node.selected .diagram-node {
  border-color: var(--node-stroke-strong);
  box-shadow: 0 0 0 2px rgba(158, 142, 241, 0.14);
}

.group-node {
  width: 100%;
  height: 100%;
  border: 1px solid var(--group-stroke);
  border-radius: 0;
  background: var(--group-fill);
  box-sizing: border-box;
  pointer-events: none;
}

.group-node__label {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-ink);
  text-align: center;
}
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run build`
Expected: PASS. Visual check: nodes look like light Mermaid rectangles and `Prompt Assembly` reads as a pale group boundary.

- [ ] **Step 6: Commit**

```bash
git add src/webview-app/mapping/toFlowNodes.js src/webview-app/index.css test/to-flow-nodes.test.js
git commit -m "style: align node and group visuals with mermaid"
```

### Task 3: Make edges quieter and more directional

**Files:**
- Modify: `src/webview-app/mapping/toFlowEdges.js`
- Modify: `src/webview-app/index.css`
- Modify: `test/to-flow-edges.test.js`

- [ ] **Step 1: Write the failing test**

Update the first test in `test/to-flow-edges.test.js` to expect readable edge props:

```js
test('maps graph edges to stable readable XYFlow edges', () => {
  const edges = toFlowEdges([{ from: 'start', to: 'review', label: '通过' }])

  assert.deepEqual(edges, [
    {
      id: 'start->review#通过',
      source: 'start',
      target: 'review',
      label: '通过',
      type: 'smoothstep',
      markerEnd: { type: 'arrowclosed', color: '#6f6f78' },
      style: { stroke: '#6f6f78', strokeWidth: 1.2 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: { fill: '#55555f', fontSize: 11, fontWeight: 400 },
    },
  ])
})
```

Update the dashed edge test to expect merged dashed style:

```js
test('maps dashed graph edges to dashed XYFlow edges', () => {
  const edges = toFlowEdges([
    { from: 'R1', to: 'D3', label: 'tests / injected runner', style: 'dashed' },
  ])

  assert.equal(edges[0].animated, false)
  assert.deepEqual(edges[0].style, { stroke: '#6f6f78', strokeWidth: 1.2, strokeDasharray: '4 4' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because edge marker, label style, and merged dashed style are not mapped yet.

- [ ] **Step 3: Implement readable edge props**

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

export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge) => {
    const flowEdge = {
      id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'smoothstep',
      markerEnd: READ_EDGE_MARKER,
      style: READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
    }

    if (edge.style === 'dashed') {
      flowEdge.animated = false
      flowEdge.style = { ...READ_EDGE_STYLE, strokeDasharray: '4 4' }
    }

    return flowEdge
  })
}
```

- [ ] **Step 4: Hide handles until interaction and quiet label backgrounds**

In `src/webview-app/index.css`, update handle and edge rules:

```css
.diagram-node .react-flow__handle {
  width: 8px;
  height: 8px;
  border: 1px solid var(--node-stroke-strong);
  background: var(--panel);
  opacity: 0;
  transition: opacity 120ms ease;
}

.react-flow__node:hover .diagram-node .react-flow__handle,
.react-flow__node.selected .diagram-node .react-flow__handle {
  opacity: 1;
}

.diagram-node .react-flow__handle-left {
  left: -5px;
}

.diagram-node .react-flow__handle-right {
  right: -5px;
}

.react-flow__edge-path,
.react-flow__connection-path {
  stroke: var(--edge);
  stroke-width: 1.2px;
}

.react-flow__edge-textbg {
  fill: rgba(248, 248, 244, 0.92);
  stroke: transparent;
}
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run build`
Expected: PASS. Visual check: edges are lighter than nodes, dashed test edges are quieter, labels do not dominate, and arrow direction is clear.

- [ ] **Step 6: Commit**

```bash
git add src/webview-app/mapping/toFlowEdges.js src/webview-app/index.css test/to-flow-edges.test.js
git commit -m "style: make diagram edges read-first"
```

### Task 4: Switch the canvas default to a read-first surface

**Files:**
- Modify: `src/webview-app/components/FlowCanvas.jsx`
- Create: `test/flow-canvas-read-mode.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/flow-canvas-read-mode.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('flow canvas defaults to read-first chrome', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.doesNotMatch(source, /MiniMap/)
  assert.match(source, /showInteractive=\{false\}/)
  assert.match(source, /hideAttribution: true/)
  assert.match(source, /fitViewOptions=\{\{ padding: 0\.18 \}\}/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `FlowCanvas.jsx` still imports and renders `MiniMap`, does not hide attribution, and does not set the read-mode `fitViewOptions`.

- [ ] **Step 3: Hide heavy editor chrome by default**

Replace `src/webview-app/components/FlowCanvas.jsx` with:

```jsx
import React from 'react'
import { Background, Controls, ReactFlow } from '@xyflow/react'

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStop,
  nodeTypes,
}) {
  return (
    <div className="flow-canvas">
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        proOptions={{ hideAttribution: true }}
      >
        <Background className="flow-background" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 4: Run verification**

Run: `npm test && npm run build`
Expected: PASS. Visual check: minimap is gone, attribution is hidden, the background grid is quieter, and controls are reduced.

- [ ] **Step 5: Commit**

```bash
git add src/webview-app/components/FlowCanvas.jsx test/flow-canvas-read-mode.test.js
git commit -m "style: make diagram canvas read-first"
```

### Task 5: Document visual acceptance

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the acceptance checklist**

Add this section to `README.md`:

```md
## Visual acceptance target

`complex-runtime.flow` is the first-stage visual acceptance sample. It should be compared against `mermaid例图.md` rendered by Mermaid.

Acceptance checks:

- The diagram opens without blank-screen errors.
- The first screen reads as a top-to-bottom flow, not as an editor debugging surface.
- Default handles are hidden until hover or selection.
- Edges are lighter than nodes and have clear arrow direction.
- Edge labels are readable and do not dominate the graph.
- `Prompt Assembly` appears as a light group boundary.
- The whole graph is dense enough to inspect with zoom and pan, without a sprawling one-node-per-screen feel.
```

- [ ] **Step 2: Run verification**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: define visual acceptance target"
```

### Task 6: Final manual verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Build the extension assets**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Manual VS Code check**

Open `complex-runtime.flow` in the Extension Development Host and run:

```text
Diagram Editor: Open Preview
```

Expected:

- The view is not blank.
- The minimap is not visible.
- The graph visually resembles the Mermaid reference in `image copy 6.png` and `image copy 7.png` more than the current screenshots `image copy 8.png` and `image copy 9.png`.
- Dragging a node still works as temporary layout.
- Clicking `整理布局` restores the dagre layout.
- Selecting a node still enables rename through the inspector.
