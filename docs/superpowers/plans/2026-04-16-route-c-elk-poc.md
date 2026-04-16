# Route C ELK PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Route C / ELK proof of concept that converts the existing runtime graph into a pure `DiagramIR`, runs ELK on a single-group diagram, extracts node/group boxes plus edge points into `LayoutResult` / `RoutingResult`, and renders the edge from those points instead of computing geometry in the renderer.

**Architecture:** Keep the current Dagre pipeline untouched. Add a parallel PoC pipeline: `graph -> DiagramIR -> ELK JSON -> ELK output -> { layoutResult, routingResult } -> PoC XYFlow view model`. The PoC renderer must serialize `RoutingResult.points` into SVG path data and must not infer geometry from node positions.

**Tech Stack:** Node.js ESM, `node:test`, React, `@xyflow/react`, `elkjs`

---

## File Structure

- Create: `src/ir/toDiagramIR.js`
  Normalize the current runtime `graph` into a geometry-free `DiagramIR`.
- Create: `src/layout/elk/toElkJson.js`
  Convert `DiagramIR` into the minimal ELK layered JSON needed for the PoC.
- Create: `src/layout/elk/runElkLayout.js`
  Run ELK using `elkjs` and return the raw ELK result.
- Create: `src/layout/elk/fromElkLayout.js`
  Convert ELK output into `LayoutResult` and `RoutingResult`.
- Create: `src/routing/serializeEdgePoints.js`
  Turn `RoutingResult.points` into an SVG path string.
- Create: `src/webview-app/mapping/toPocFlowNodes.js`
  Build XYFlow nodes from ELK-owned group/node boxes.
- Create: `src/webview-app/mapping/toPocFlowEdges.js`
  Build XYFlow edges that carry `points` from `RoutingResult`.
- Create: `src/webview-app/components/edges/PocRouteEdge.jsx`
  Render one edge by serializing `data.points`.
- Modify: `package.json`
  Add `elkjs` dependency.
- Modify: `package-lock.json`
  Capture the installed `elkjs` dependency.
- Create: `test/to-diagram-ir.test.js`
  Cover `graph -> DiagramIR` normalization.
- Create: `test/to-elk-json.test.js`
  Cover the minimal ELK JSON shape.
- Create: `test/from-elk-layout.test.js`
  Cover extraction of boxes and edge points from ELK output.
- Create: `test/serialize-edge-points.test.js`
  Cover SVG path serialization from point sequences.
- Create: `test/poc-route-edge.test.js`
  Lock the renderer contract so it only consumes `data.points`.
- Create: `test/to-poc-flow-nodes.test.js`
  Cover group/node XYFlow mapping from `LayoutResult`.
- Create: `test/to-poc-flow-edges.test.js`
  Cover edge XYFlow mapping from `RoutingResult`.
- Create: `test/route-c-poc-contract.test.js`
  Run the full PoC chain on `1 group + 2 nodes + 1 edge` and verify ELK owns both boxes and edge points.

### Task 1: Normalize the current graph into `DiagramIR`

**Files:**
- Create: `src/ir/toDiagramIR.js`
- Create: `test/to-diagram-ir.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/to-diagram-ir.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toDiagramIR } from '../src/ir/toDiagramIR.js'

test('normalizes the runtime graph into a geometry-free DiagramIR', () => {
  const ir = toDiagramIR({
    direction: 'TD',
    groups: [{ id: 'stage', label: 'Stage' }],
    nodes: [
      { id: 'task', label: 'Task', groupId: 'stage' },
      { id: 'done', label: 'Done', type: 'end', color: '#00aa88' },
    ],
    edges: [
      { id: 'edge_1', from: 'task', to: 'done', label: 'next', style: 'dashed' },
    ],
  })

  assert.deepEqual(ir, {
    direction: 'TD',
    groups: [
      {
        id: 'stage',
        label: 'Stage',
        parentGroupId: null,
      },
    ],
    nodes: [
      {
        id: 'task',
        label: 'Task',
        type: 'default',
        groupId: 'stage',
        style: {
          color: null,
        },
      },
      {
        id: 'done',
        label: 'Done',
        type: 'end',
        groupId: null,
        style: {
          color: '#00aa88',
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        from: 'task',
        to: 'done',
        label: 'next',
        style: {
          pattern: 'dashed',
        },
      },
    ],
  })
})

test('does not leak layout or renderer fields into DiagramIR', () => {
  const ir = toDiagramIR({
    direction: 'LR',
    groups: [],
    nodes: [
      { id: 'task', label: 'Task', x: 40, y: 50, sourcePosition: 'right' },
    ],
    edges: [
      { id: 'edge_1', from: 'task', to: 'done', path: 'M 0 0 L 1 1' },
    ],
  })

  assert.deepEqual(ir.nodes[0], {
    id: 'task',
    label: 'Task',
    type: 'default',
    groupId: null,
    style: {
      color: null,
    },
  })
  assert.deepEqual(ir.edges[0], {
    id: 'edge_1',
    from: 'task',
    to: 'done',
    label: null,
    style: {
      pattern: 'solid',
    },
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/to-diagram-ir.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/ir/toDiagramIR.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/ir/toDiagramIR.js`:

```js
function normalizeDirection(direction) {
  return direction === 'TD' || direction === 'TB' ? direction : 'LR'
}

function normalizeNodeType(type) {
  return type ?? 'default'
}

function normalizeColor(color) {
  return color ?? null
}

function normalizeEdgeLabel(label) {
  return typeof label === 'string' && label.trim().length > 0 ? label : null
}

function normalizeEdgePattern(style) {
  return style === 'dashed' || style === 'dotted' || style === 'dashdot'
    ? style
    : 'solid'
}

export function toDiagramIR(graph) {
  return {
    direction: normalizeDirection(graph.direction),
    groups: (graph.groups ?? []).map((group) => ({
      id: group.id,
      label: group.label,
      parentGroupId: null,
    })),
    nodes: (graph.nodes ?? []).map((node) => ({
      id: node.id,
      label: node.label,
      type: normalizeNodeType(node.type),
      groupId: node.groupId ?? null,
      style: {
        color: normalizeColor(node.color),
      },
    })),
    edges: (graph.edges ?? []).map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: normalizeEdgeLabel(edge.label),
      style: {
        pattern: normalizeEdgePattern(edge.style),
      },
    })),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/to-diagram-ir.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add test/to-diagram-ir.test.js src/ir/toDiagramIR.js
git commit -m "feat: add diagram ir adapter"
```

### Task 2: Add the minimal ELK adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/layout/elk/toElkJson.js`
- Create: `test/to-elk-json.test.js`

- [ ] **Step 1: Write the failing test**

Create `test/to-elk-json.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toElkJson } from '../src/layout/elk/toElkJson.js'

test('builds the minimal ELK layered graph from DiagramIR', () => {
  const elkGraph = toElkJson({
    direction: 'LR',
    groups: [
      { id: 'stage', label: 'Stage', parentGroupId: null },
    ],
    nodes: [
      { id: 'task', label: 'Task', type: 'default', groupId: 'stage', style: { color: null } },
      { id: 'done', label: 'Done', type: 'end', groupId: 'stage', style: { color: null } },
    ],
    edges: [
      { id: 'edge_1', from: 'task', to: 'done', label: 'next', style: { pattern: 'solid' } },
    ],
  })

  assert.equal(elkGraph.id, 'root')
  assert.deepEqual(elkGraph.layoutOptions, {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
  })
  assert.deepEqual(elkGraph.children, [
    {
      id: 'group:stage',
      labels: [{ text: 'Stage' }],
      children: [
        {
          id: 'task',
          width: 132,
          height: 46,
          labels: [{ text: 'Task' }],
        },
        {
          id: 'done',
          width: 132,
          height: 46,
          labels: [{ text: 'Done' }],
        },
      ],
    },
  ])
  assert.deepEqual(elkGraph.edges, [
    {
      id: 'edge_1',
      sources: ['task'],
      targets: ['done'],
      labels: [{ text: 'next' }],
    },
  ])
})

test('maps TD diagrams to ELK DOWN direction', () => {
  const elkGraph = toElkJson({
    direction: 'TD',
    groups: [],
    nodes: [],
    edges: [],
  })

  assert.equal(elkGraph.layoutOptions['elk.direction'], 'DOWN')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/to-elk-json.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/layout/elk/toElkJson.js`.

- [ ] **Step 3: Add `elkjs` and write the minimal implementation**

Install the dependency:

```bash
npm install elkjs
```

Expected: `package.json` and `package-lock.json` change.

Create `src/layout/elk/toElkJson.js`:

```js
import { getNodeDimensions } from '../../model/nodeDimensions.js'

function toElkDirection(direction) {
  return direction === 'TD' || direction === 'TB' ? 'DOWN' : 'RIGHT'
}

function toElkNode(node) {
  const dimensions = getNodeDimensions({
    label: node.label,
    type: node.type,
  })

  return {
    id: node.id,
    width: dimensions.w,
    height: dimensions.h,
    labels: [{ text: node.label }],
  }
}

export function toElkJson(diagramIR) {
  const groupedChildren = diagramIR.groups.map((group) => ({
    id: `group:${group.id}`,
    labels: [{ text: group.label }],
    children: diagramIR.nodes
      .filter((node) => node.groupId === group.id)
      .map(toElkNode),
  }))

  const rootChildren = diagramIR.nodes
    .filter((node) => !node.groupId)
    .map(toElkNode)

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': toElkDirection(diagramIR.direction),
    },
    children: [...groupedChildren, ...rootChildren],
    edges: diagramIR.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.from],
      targets: [edge.to],
      ...(edge.label ? { labels: [{ text: edge.label }] } : {}),
    })),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test test/to-elk-json.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json test/to-elk-json.test.js src/layout/elk/toElkJson.js
git commit -m "feat: add minimal elk json adapter"
```

### Task 3: Extract `LayoutResult` and `RoutingResult` from ELK

**Files:**
- Create: `src/layout/elk/runElkLayout.js`
- Create: `src/layout/elk/fromElkLayout.js`
- Create: `test/from-elk-layout.test.js`
- Create: `test/route-c-poc-contract.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/from-elk-layout.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { fromElkLayout } from '../src/layout/elk/fromElkLayout.js'

test('extracts group boxes, node boxes, and edge points from ELK output', () => {
  const result = fromElkLayout({
    id: 'root',
    children: [
      {
        id: 'group:stage',
        x: 20,
        y: 30,
        width: 320,
        height: 180,
        children: [
          { id: 'task', x: 24, y: 36, width: 132, height: 46 },
          { id: 'done', x: 180, y: 36, width: 132, height: 46 },
        ],
      },
    ],
    edges: [
      {
        id: 'edge_1',
        sections: [
          {
            startPoint: { x: 156, y: 89 },
            bendPoints: [{ x: 180, y: 89 }],
            endPoint: { x: 180, y: 89 },
          },
        ],
      },
    ],
  })

  assert.deepEqual(result.layoutResult, {
    groups: {
      stage: { x: 20, y: 30, w: 320, h: 180 },
    },
    nodes: {
      task: { x: 44, y: 66, w: 132, h: 46 },
      done: { x: 200, y: 66, w: 132, h: 46 },
    },
  })
  assert.deepEqual(result.routingResult, {
    edges: {
      edge_1: {
        points: [
          { x: 156, y: 89 },
          { x: 180, y: 89 },
          { x: 180, y: 89 },
        ],
        label: null,
      },
    },
  })
})
```

Create `test/route-c-poc-contract.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toDiagramIR } from '../src/ir/toDiagramIR.js'
import { toElkJson } from '../src/layout/elk/toElkJson.js'
import { runElkLayout } from '../src/layout/elk/runElkLayout.js'
import { fromElkLayout } from '../src/layout/elk/fromElkLayout.js'

test('route c poc gets group boxes, node boxes, and edge points from ELK', async () => {
  const ir = toDiagramIR({
    direction: 'LR',
    groups: [{ id: 'stage', label: 'Stage' }],
    nodes: [
      { id: 'task', label: 'Task', groupId: 'stage' },
      { id: 'done', label: 'Done', groupId: 'stage' },
    ],
    edges: [{ id: 'edge_1', from: 'task', to: 'done' }],
  })

  const elkGraph = toElkJson(ir)
  const elkLayout = await runElkLayout(elkGraph)
  const { layoutResult, routingResult } = fromElkLayout(elkLayout)

  assert.ok(layoutResult.groups.stage)
  assert.ok(layoutResult.nodes.task)
  assert.ok(layoutResult.nodes.done)
  assert.ok(routingResult.edges.edge_1)
  assert.ok(routingResult.edges.edge_1.points.length >= 2)
  assert.notDeepEqual(layoutResult.nodes.task, layoutResult.nodes.done)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/from-elk-layout.test.js test/route-c-poc-contract.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `runElkLayout.js` and `fromElkLayout.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/layout/elk/runElkLayout.js`:

```js
import ELK from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

export async function runElkLayout(elkGraph) {
  return elk.layout(elkGraph)
}
```

Create `src/layout/elk/fromElkLayout.js`:

```js
function collectLayoutBoxes(children, parentOffset = { x: 0, y: 0 }, layoutResult = { groups: {}, nodes: {} }) {
  for (const child of children ?? []) {
    const absoluteX = Math.round((child.x ?? 0) + parentOffset.x)
    const absoluteY = Math.round((child.y ?? 0) + parentOffset.y)
    const box = {
      x: absoluteX,
      y: absoluteY,
      w: Math.round(child.width ?? 0),
      h: Math.round(child.height ?? 0),
    }

    if (child.id?.startsWith('group:')) {
      layoutResult.groups[child.id.slice('group:'.length)] = box
      collectLayoutBoxes(child.children, { x: absoluteX, y: absoluteY }, layoutResult)
      continue
    }

    layoutResult.nodes[child.id] = box
  }

  return layoutResult
}

function toEdgePoints(edge) {
  const section = edge.sections?.[0]
  if (!section) {
    return []
  }

  return [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ].map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }))
}

export function fromElkLayout(elkLayout) {
  return {
    layoutResult: collectLayoutBoxes(elkLayout.children),
    routingResult: {
      edges: Object.fromEntries(
        (elkLayout.edges ?? []).map((edge) => [
          edge.id,
          {
            points: toEdgePoints(edge),
            label: null,
          },
        ]),
      ),
    },
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/from-elk-layout.test.js test/route-c-poc-contract.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add test/from-elk-layout.test.js test/route-c-poc-contract.test.js src/layout/elk/runElkLayout.js src/layout/elk/fromElkLayout.js
git commit -m "feat: extract elk layout and routing results"
```

### Task 4: Give the PoC renderer exclusive ownership of edge path consumption

**Files:**
- Create: `src/routing/serializeEdgePoints.js`
- Create: `src/webview-app/components/edges/PocRouteEdge.jsx`
- Create: `test/serialize-edge-points.test.js`
- Create: `test/poc-route-edge.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/serialize-edge-points.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { serializeEdgePoints } from '../src/routing/serializeEdgePoints.js'

test('serializes a point sequence into a straight SVG polyline path', () => {
  assert.equal(
    serializeEdgePoints([
      { x: 20, y: 30 },
      { x: 60, y: 30 },
      { x: 60, y: 80 },
    ]),
    'M 20 30 L 60 30 L 60 80',
  )
})
```

Create `test/poc-route-edge.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('poc route edge reads data.points and does not compute geometry from endpoints', async () => {
  const source = await readFile('src/webview-app/components/edges/PocRouteEdge.jsx', 'utf8')

  assert.match(source, /serializeEdgePoints/)
  assert.match(source, /data\?\.points/)
  assert.doesNotMatch(source, /sourceNode/)
  assert.doesNotMatch(source, /targetNode/)
  assert.doesNotMatch(source, /toNormalReadEdgePath/)
  assert.doesNotMatch(source, /readEdgeGeometry/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/serialize-edge-points.test.js test/poc-route-edge.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `serializeEdgePoints.js` and missing `PocRouteEdge.jsx`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/routing/serializeEdgePoints.js`:

```js
export function serializeEdgePoints(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return ''
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(point.x)} ${Math.round(point.y)}`)
    .join(' ')
}
```

Create `src/webview-app/components/edges/PocRouteEdge.jsx`:

```js
import React from 'react'
import { BaseEdge } from '@xyflow/react'

import { serializeEdgePoints } from '../../../routing/serializeEdgePoints.js'

export function PocRouteEdge({
  id,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
}) {
  return (
    <BaseEdge
      id={id}
      path={serializeEdgePoints(data?.points ?? [])}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/serialize-edge-points.test.js test/poc-route-edge.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add test/serialize-edge-points.test.js test/poc-route-edge.test.js src/routing/serializeEdgePoints.js src/webview-app/components/edges/PocRouteEdge.jsx
git commit -m "feat: add route c poc edge renderer"
```

### Task 5: Build the PoC XYFlow view model from ELK-owned results

**Files:**
- Create: `src/webview-app/mapping/toPocFlowNodes.js`
- Create: `src/webview-app/mapping/toPocFlowEdges.js`
- Create: `test/to-poc-flow-nodes.test.js`
- Create: `test/to-poc-flow-edges.test.js`

- [ ] **Step 1: Write the failing tests**

Create `test/to-poc-flow-nodes.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toPocFlowNodes } from '../src/webview-app/mapping/toPocFlowNodes.js'

test('maps ELK-owned group and node boxes into XYFlow nodes without recomputing group bounds', () => {
  const nodes = toPocFlowNodes(
    {
      direction: 'LR',
      groups: [{ id: 'stage', label: 'Stage' }],
      nodes: [
        { id: 'task', label: 'Task', type: 'default', groupId: 'stage', style: { color: null } },
      ],
    },
    {
      groups: {
        stage: { x: 20, y: 30, w: 320, h: 180 },
      },
      nodes: {
        task: { x: 44, y: 66, w: 132, h: 46 },
      },
    },
  )

  assert.deepEqual(nodes, [
    {
      id: 'group:stage',
      type: 'groupNode',
      className: 'diagram-flow-group',
      position: { x: 20, y: 30 },
      data: { label: 'Stage' },
      draggable: false,
      selectable: false,
      style: { width: 320, height: 180 },
    },
    {
      id: 'task',
      type: 'diagramNode',
      className: 'diagram-flow-node',
      position: { x: 44, y: 66 },
      data: {
        label: 'Task',
        nodeType: 'default',
        sourcePosition: 'right',
        targetPosition: 'left',
      },
      style: { width: 132, height: 46 },
    },
  ])
})
```

Create `test/to-poc-flow-edges.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toPocFlowEdges } from '../src/webview-app/mapping/toPocFlowEdges.js'

test('maps RoutingResult points into XYFlow edges for the poc renderer', () => {
  const edges = toPocFlowEdges(
    {
      edges: [
        { id: 'edge_1', from: 'task', to: 'done', label: 'next', style: { pattern: 'solid' } },
      ],
    },
    {
      edges: {
        edge_1: {
          points: [
            { x: 10, y: 20 },
            { x: 60, y: 20 },
          ],
          label: null,
        },
      },
    },
  )

  assert.deepEqual(edges, [
    {
      id: 'edge_1',
      source: 'task',
      target: 'done',
      label: 'next',
      type: 'pocRouteEdge',
      markerEnd: { type: 'arrowclosed', color: '#6f6f78' },
      style: { stroke: '#6f6f78', strokeWidth: 2 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: { fill: '#55555f', fontSize: 12, fontWeight: 500 },
      data: {
        edgeId: 'edge_1',
        points: [
          { x: 10, y: 20 },
          { x: 60, y: 20 },
        ],
      },
    },
  ])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
node --test test/to-poc-flow-nodes.test.js test/to-poc-flow-edges.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for the new mapping helpers.

- [ ] **Step 3: Write the minimal implementation**

Create `src/webview-app/mapping/toPocFlowNodes.js`:

```js
import { toNodeHandlePositions } from './toNodeHandlePositions.js'

export function toPocFlowNodes(diagramIR, layoutResult) {
  const handlePositions = toNodeHandlePositions(diagramIR.direction)

  const groupNodes = (diagramIR.groups ?? [])
    .filter((group) => layoutResult.groups[group.id])
    .map((group) => {
      const box = layoutResult.groups[group.id]

      return {
        id: `group:${group.id}`,
        type: 'groupNode',
        className: 'diagram-flow-group',
        position: { x: box.x, y: box.y },
        data: { label: group.label },
        draggable: false,
        selectable: false,
        style: { width: box.w, height: box.h },
      }
    })

  const diagramNodes = (diagramIR.nodes ?? [])
    .filter((node) => layoutResult.nodes[node.id])
    .map((node) => {
      const box = layoutResult.nodes[node.id]

      return {
        id: node.id,
        type: 'diagramNode',
        className: 'diagram-flow-node',
        position: { x: box.x, y: box.y },
        data: {
          label: node.label,
          nodeType: node.type,
          ...handlePositions,
        },
        style: { width: box.w, height: box.h },
      }
    })

  return [...groupNodes, ...diagramNodes]
}
```

Create `src/webview-app/mapping/toPocFlowEdges.js`:

```js
const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 2,
}

const READ_EDGE_LABEL_STYLE = {
  fill: '#55555f',
  fontSize: 12,
  fontWeight: 500,
}

const READ_EDGE_MARKER = {
  type: 'arrowclosed',
  color: '#6f6f78',
}

export function toPocFlowEdges(diagramIR, routingResult) {
  return (diagramIR.edges ?? [])
    .filter((edge) => routingResult.edges[edge.id])
    .map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label ?? undefined,
      type: 'pocRouteEdge',
      markerEnd: READ_EDGE_MARKER,
      style: READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
      data: {
        edgeId: edge.id,
        points: routingResult.edges[edge.id].points,
      },
    }))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
node --test test/to-poc-flow-nodes.test.js test/to-poc-flow-edges.test.js
```

Expected: PASS.

- [ ] **Step 5: Run the full PoC test slice**

Run:

```bash
node --test test/to-diagram-ir.test.js test/to-elk-json.test.js test/from-elk-layout.test.js test/serialize-edge-points.test.js test/poc-route-edge.test.js test/to-poc-flow-nodes.test.js test/to-poc-flow-edges.test.js test/route-c-poc-contract.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add test/to-poc-flow-nodes.test.js test/to-poc-flow-edges.test.js src/webview-app/mapping/toPocFlowNodes.js src/webview-app/mapping/toPocFlowEdges.js
git commit -m "feat: add route c elk poc view model"
```

## Self-Review

### Spec coverage

- `DiagramIR` contract: Task 1
- `toElkJson()` adapter: Task 2
- ELK output extraction into `LayoutResult` / `RoutingResult`: Task 3
- renderer consumes `RoutingResult.points`: Task 4
- minimal PoC `1 group + 2 nodes + 1 edge`: Task 3 contract test + Task 5 mapping tests
- old Dagre path left untouched: all tasks add new files or dependency-only changes and do not modify `src/model/layout.js`

No spec gaps remain for the approved PoC scope.

### Placeholder scan

- No `TBD`, `TODO`, `implement later`, or vague “handle appropriately” steps
- Every code-writing step includes concrete file content
- Every verification step includes an exact command

### Type consistency

- `DiagramIR`: `direction`, `groups`, `nodes`, `edges` used consistently across all tasks
- `LayoutResult`: `{ groups, nodes }` used consistently in Tasks 3 and 5
- `RoutingResult`: `{ edges: { [edgeId]: { points, label } } }` used consistently in Tasks 3, 4, and 5
- PoC edge type is consistently `pocRouteEdge`
