# Obsidian Dot Grid Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing `obsidian` canvas background so it behaves like an Obsidian-style dot grid: the grid stays locked to canvas coordinates during pan/zoom, dot spacing scales with zoom, and dot size stays visually constant.

**Architecture:** Keep `paper` and `gradient` on the current CSS/background path, but replace the `obsidian` branch with a dedicated SVG overlay component that reads the XYFlow viewport and computes dot-grid pattern geometry from it. Put the viewport math in a small pure helper so the behavior is unit-testable without mounting ReactFlow.

**Tech Stack:** React 19, `@xyflow/react`, SVG `pattern`, Node `node:test`, CSS

---

## File Structure

- Create: `src/webview-app/components/ObsidianDotGridBackground.jsx`
  Responsibility: render the Obsidian-style SVG background layer for the current viewport.
- Create: `src/webview-app/components/obsidianDotGridMath.js`
  Responsibility: compute scaled gap and translated pattern offsets from `{ x, y, zoom }`.
- Create: `test/obsidian-dot-grid-background.test.js`
  Responsibility: unit-test the viewport math.
- Modify: `src/webview-app/components/FlowCanvas.jsx`
  Responsibility: switch the `obsidian` branch from the generic XYFlow background to the dedicated background component while leaving other styles unchanged.
- Modify: `src/webview-app/index.css`
  Responsibility: remove the old glossy `obsidian` treatment and add neutral dark tokens/styles for the new SVG layer.
- Modify: `test/flow-canvas-read-mode.test.js`
  Responsibility: lock in the new `obsidian` rendering path.

### Task 1: Add failing tests for Obsidian background behavior

**Files:**
- Create: `test/obsidian-dot-grid-background.test.js`
- Modify: `test/flow-canvas-read-mode.test.js`

- [ ] **Step 1: Write the failing helper test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import { toObsidianDotGridPattern } from '../src/webview-app/components/obsidianDotGridMath.js'

test('scales dot spacing with zoom while keeping dot radius fixed', () => {
  const pattern = toObsidianDotGridPattern({ x: 15, y: -7, zoom: 2 })

  assert.deepEqual(pattern, {
    gap: 40,
    offsetX: 15,
    offsetY: 33,
    radius: 0.5,
  })
})

test('falls back to base spacing when zoom is invalid', () => {
  const pattern = toObsidianDotGridPattern({ x: 0, y: 0, zoom: Number.NaN })

  assert.deepEqual(pattern, {
    gap: 20,
    offsetX: 0,
    offsetY: 0,
    radius: 0.5,
  })
})
```

- [ ] **Step 2: Extend the FlowCanvas contract test with the new rendering path**

```js
test('flow canvas uses a dedicated obsidian dot-grid layer', async () => {
  const source = await readFile('src/webview-app/components/FlowCanvas.jsx', 'utf8')

  assert.match(source, /ObsidianDotGridBackground/)
  assert.match(source, /backgroundStyle === 'obsidian'/)
  assert.match(source, /variant=\{BackgroundVariant\.Dots\}/)
})
```

Note: the last assertion is expected to fail at first because the current file does not import `BackgroundVariant` at all.

- [ ] **Step 3: Run the focused tests to verify red**

Run:

```bash
node --test test/obsidian-dot-grid-background.test.js test/flow-canvas-read-mode.test.js
```

Expected:
- `test/obsidian-dot-grid-background.test.js` fails because `obsidianDotGridMath.js` does not exist yet
- the new `FlowCanvas` contract assertion fails because `ObsidianDotGridBackground` and `BackgroundVariant` are not present yet

- [ ] **Step 4: Commit the red tests**

```bash
git add test/obsidian-dot-grid-background.test.js test/flow-canvas-read-mode.test.js
git commit -m "test: cover obsidian dot grid background behavior"
```

### Task 2: Implement viewport-locked Obsidian dot grid

**Files:**
- Create: `src/webview-app/components/obsidianDotGridMath.js`
- Create: `src/webview-app/components/ObsidianDotGridBackground.jsx`
- Modify: `src/webview-app/components/FlowCanvas.jsx`

- [ ] **Step 1: Implement the pure viewport math helper**

```js
const BASE_GAP = 20
const DOT_RADIUS = 0.5

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

export function toObsidianDotGridPattern(viewport) {
  const zoom = Number.isFinite(viewport?.zoom) && viewport.zoom > 0 ? viewport.zoom : 1
  const gap = BASE_GAP * zoom
  const x = Number.isFinite(viewport?.x) ? viewport.x : 0
  const y = Number.isFinite(viewport?.y) ? viewport.y : 0

  return {
    gap,
    offsetX: mod(x, gap),
    offsetY: mod(y, gap),
    radius: DOT_RADIUS,
  }
}
```

- [ ] **Step 2: Render the dedicated SVG background component**

```jsx
import React from 'react'
import { useViewport } from '@xyflow/react'

import { toObsidianDotGridPattern } from './obsidianDotGridMath.js'

export function ObsidianDotGridBackground() {
  const viewport = useViewport()
  const pattern = React.useMemo(
    () => toObsidianDotGridPattern(viewport),
    [viewport],
  )

  return (
    <svg className="obsidian-dot-grid" aria-hidden="true">
      <defs>
        <pattern
          id="obsidian-dot-grid-pattern"
          x={pattern.offsetX}
          y={pattern.offsetY}
          width={pattern.gap}
          height={pattern.gap}
          patternUnits="userSpaceOnUse"
        >
          <circle
            className="obsidian-dot-grid__dot"
            cx={pattern.radius}
            cy={pattern.radius}
            r={pattern.radius}
          />
        </pattern>
      </defs>
      <rect className="obsidian-dot-grid__base" x="0" y="0" width="100%" height="100%" />
      <rect className="obsidian-dot-grid__pattern" x="0" y="0" width="100%" height="100%" />
    </svg>
  )
}
```

- [ ] **Step 3: Switch `FlowCanvas` to the new `obsidian` branch and keep built-in backgrounds for other modes**

```jsx
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react'

import { ObsidianDotGridBackground } from './ObsidianDotGridBackground.jsx'

const shouldRenderObsidianBackground = backgroundStyle === 'obsidian'

...

      <ReactFlow
        defaultViewport={resolvedInitialViewport}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={(_event, nextViewport) => onViewportChange?.(nextViewport)}
        proOptions={{ hideAttribution: true }}
      >
        {shouldRenderObsidianBackground ? (
          <ObsidianDotGridBackground />
        ) : (
          <Background
            className="flow-background"
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.35}
          />
        )}
        <Controls showInteractive={false} />
      </ReactFlow>
```

- [ ] **Step 4: Run the focused tests to verify green**

Run:

```bash
node --test test/obsidian-dot-grid-background.test.js test/flow-canvas-read-mode.test.js
```

Expected:
- both test files pass

- [ ] **Step 5: Commit the implementation**

```bash
git add src/webview-app/components/obsidianDotGridMath.js src/webview-app/components/ObsidianDotGridBackground.jsx src/webview-app/components/FlowCanvas.jsx test/obsidian-dot-grid-background.test.js test/flow-canvas-read-mode.test.js
git commit -m "feat: rebuild obsidian canvas background"
```

### Task 3: Tune visual styling to match the Obsidian reference

**Files:**
- Modify: `src/webview-app/index.css`
- Test: `node --test test/obsidian-dot-grid-background.test.js test/flow-canvas-read-mode.test.js`

- [ ] **Step 1: Replace the old glossy obsidian CSS with neutral tokens for the SVG layer**

```css
.flow-canvas--obsidian {
  --canvas-base: #1e1e1e;
  background: var(--canvas-base);
}

.obsidian-dot-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.obsidian-dot-grid__base {
  fill: #1e1e1e;
}

.obsidian-dot-grid__pattern {
  fill: url(#obsidian-dot-grid-pattern);
}

.obsidian-dot-grid__dot {
  fill: #444444;
  opacity: 0.38;
}

.flow-canvas--obsidian::before {
  content: none;
}

.flow-canvas--obsidian .react-flow__background {
  display: none;
}
```

- [ ] **Step 2: Keep the canvas content above the SVG layer**

```css
.flow-canvas > .react-flow {
  position: relative;
  z-index: 1;
}
```

If that rule already exists, keep it and only make sure the new SVG does not sit above nodes or handles.

- [ ] **Step 3: Run the focused tests and then the full suite**

Run:

```bash
node --test test/obsidian-dot-grid-background.test.js test/flow-canvas-read-mode.test.js
npm test
```

Expected:
- focused tests pass
- full suite remains green

- [ ] **Step 4: Commit the visual tuning**

```bash
git add src/webview-app/index.css
git commit -m "style: align obsidian background with canvas reference"
```

## Self-Review

- Spec coverage check: the plan covers replacing the `obsidian` branch, locking the grid to the viewport, scaling gap with zoom, keeping dot size fixed, and preserving non-obsidian behavior.
- Placeholder scan: no `TODO`/`TBD` markers remain; each task includes concrete files, commands, and code blocks.
- Type consistency: the plan consistently uses `ObsidianDotGridBackground` and `toObsidianDotGridPattern`; `backgroundStyle` remains `obsidian`, matching the existing host/webview contract.
