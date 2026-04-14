# Flow Node Type + Color Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add preset node `type` variants with shape+theme-aware color defaults, plus optional `color` / `colour` overrides, without changing the existing `.flow` editing model.

**Architecture:** Keep the DSL small: `type` remains a node option and now selects one of five built-in visual presets (`default`, `decision`, `start`, `end`, `input`). Add optional `color=` / `colour=` parsing on nodes, serialize canonically as `color=`, pass the chosen type and optional override through the webview mapping layer, and let the node component/CSS resolve shape and theme-adapted colors.

**Tech Stack:** Node test runner, VS Code custom editor host, React 19, XYFlow, CSS custom properties

---

### Task 1: Extend DSL Node Options for `type` Presets and `color`

**Files:**
- Modify: `src/model/parseDiagram.js`
- Modify: `src/model/serializeDiagram.js`
- Modify: `test/dsl-parser.test.js`
- Modify: `test/serialize-diagram.test.js`

- [ ] **Step 1: Write the failing parser and serializer tests**

Add these test blocks.

```js
test('parses node type presets with color and colour overrides', () => {
  const graph = parseDiagram([
    'node start "开始" type=start color=blue',
    'node end "结束" type=end colour=#d14d8b',
    'node input "输入" type=input',
  ].join('\n'))

  assert.deepEqual(graph.nodes, [
    { id: 'start', label: '开始', type: 'start', color: 'blue' },
    { id: 'end', label: '结束', type: 'end', color: '#d14d8b' },
    { id: 'input', label: '输入', type: 'input' },
  ])
})

test('serializes node color overrides canonically with color=', () => {
  const graph = {
    direction: 'LR',
    groups: [],
    nodes: [
      { id: 'start', label: '开始', type: 'start', color: 'blue' },
      { id: 'end', label: '结束', type: 'end', color: '#d14d8b' },
    ],
    edges: [],
  }

  assert.equal(
    serializeDiagram(graph),
    [
      'dir LR',
      '',
      'node start "开始" type=start color=blue',
      'node end "结束" type=end color=#d14d8b',
      '',
    ].join('\\n'),
  )
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test test/dsl-parser.test.js test/serialize-diagram.test.js
```

Expected: FAIL because `parseNodeOptions()` rejects `color=` / `colour=` and `serializeDiagram()` does not emit node colors.

- [ ] **Step 3: Implement minimal parser + serializer support**

Update `parseNodeOptions()` to accept `color=` and `colour=` with the same validation rule used for simple identifiers plus `#hex` values. Persist the parsed value on `node.color`. Keep `type=` behavior intact.

```js
const IDENTIFIER_OR_HEX_PATTERN = /^(#[0-9A-Fa-f]{3,8}|[A-Za-z][A-Za-z0-9_-]*)$/

if (token.startsWith('color=') || token.startsWith('colour=')) {
  const [, rawColor] = token.split('=')
  if (!rawColor || !IDENTIFIER_OR_HEX_PATTERN.test(rawColor) || options.color) {
    throw new Error(`Invalid node line: ${line}`)
  }
  options.color = rawColor
  index += 1
  continue
}
```

Update node serialization to emit `color=` after `type=` when `node.color` exists.

```js
for (const node of graph.nodes) {
  const groupPart = node.groupId ? ` in ${node.groupId}` : ''
  const typePart = node.type ? ` type=${node.type}` : ''
  const colorPart = node.color ? ` color=${node.color}` : ''
  lines.push(`node ${node.id} "${escapeLabel(node.label)}"${groupPart}${typePart}${colorPart}`)
}
```

- [ ] **Step 4: Re-run the focused tests**

Run:

```bash
node --test test/dsl-parser.test.js test/serialize-diagram.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the DSL layer changes**

```bash
git add src/model/parseDiagram.js src/model/serializeDiagram.js test/dsl-parser.test.js test/serialize-diagram.test.js
git commit -m "feat: add flow node color options"
```

### Task 2: Pass Node Type + Color Through the Webview Mapping Layer

**Files:**
- Modify: `src/webview-app/mapping/toFlowNodes.js`
- Modify: `src/webview-app/components/nodes/DiagramNode.jsx`
- Modify: `test/to-flow-nodes.test.js`

- [ ] **Step 1: Write the failing mapping tests**

Extend `test/to-flow-nodes.test.js` with these assertions.

```js
test('maps preset node types and color overrides into diagram node data', () => {
  const nodes = toFlowNodes(
    {
      direction: 'LR',
      groups: [],
      nodes: [
        { id: 'start', label: '开始', type: 'start', color: 'blue' },
        { id: 'end', label: '结束', type: 'end' },
      ],
    },
    {
      nodes: {
        start: { x: 80, y: 120, w: 132, h: 46 },
        end: { x: 280, y: 120, w: 132, h: 46 },
      },
    },
  )

  assert.deepEqual(nodes[0].data, {
    label: '开始',
    nodeType: 'start',
    nodeColor: 'blue',
    targetPosition: 'left',
    sourcePosition: 'right',
  })
  assert.deepEqual(nodes[1].data, {
    label: '结束',
    nodeType: 'end',
    targetPosition: 'left',
    sourcePosition: 'right',
  })
})

test('defaults diagram nodes to the default preset when type is omitted', () => {
  const nodes = toFlowNodes(
    {
      direction: 'LR',
      groups: [],
      nodes: [{ id: 'plain', label: '普通节点' }],
    },
    { nodes: { plain: { x: 80, y: 120, w: 132, h: 46 } } },
  )

  assert.equal(nodes[0].data.nodeType, 'default')
})
```

- [ ] **Step 2: Run the focused mapping test to verify it fails**

Run:

```bash
node --test test/to-flow-nodes.test.js
```

Expected: FAIL because untyped nodes currently omit `nodeType`, and color is not mapped through.

- [ ] **Step 3: Implement the minimal mapping + component API**

Set a default preset in `toFlowNodes()` and pass optional `nodeColor`.

```js
data: {
  label: node.label,
  nodeType: node.type ?? 'default',
  ...(node.color ? { nodeColor: node.color } : {}),
  ...handlePositions,
},
```

Replace the hard-coded `decision` class branch in `DiagramNode.jsx` with a type-derived class and inline CSS variables for color override.

```jsx
const nodeType = data.nodeType ?? 'default'
const nodeClassName = [
  'diagram-node',
  `diagram-node--type-${nodeType}`,
  data.isEditing ? 'diagram-node--editing' : '',
].filter(Boolean).join(' ')

const nodeStyle = data.nodeColor
  ? {
      '--node-accent-fill': data.nodeColor,
      '--node-accent-stroke': data.nodeColor,
      '--node-accent-stroke-strong': data.nodeColor,
    }
  : undefined

return (
  <div className={nodeClassName} style={nodeStyle}>
```

- [ ] **Step 4: Re-run the focused mapping test**

Run:

```bash
node --test test/to-flow-nodes.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the mapping changes**

```bash
git add src/webview-app/mapping/toFlowNodes.js src/webview-app/components/nodes/DiagramNode.jsx test/to-flow-nodes.test.js
git commit -m "feat: map flow node presets into webview nodes"
```

### Task 3: Add Flexoki-Inspired Node Presets and Color Override Styling

**Files:**
- Modify: `src/webview-app/index.css`
- Create: `test/node-type-style-contract.test.js`

- [ ] **Step 1: Write the failing style contract test**

Create `test/node-type-style-contract.test.js` with source-level checks for the required preset classes and override variables.

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('node stylesheet defines the preset type classes and color override variables', () => {
  const source = readFileSync(new URL('../src/webview-app/index.css', import.meta.url), 'utf8')

  assert.match(source, /\.diagram-node--type-default\b/)
  assert.match(source, /\.diagram-node--type-decision\b/)
  assert.match(source, /\.diagram-node--type-start\b/)
  assert.match(source, /\.diagram-node--type-end\b/)
  assert.match(source, /\.diagram-node--type-input\b/)
  assert.match(source, /--node-accent-fill:/)
  assert.match(source, /--node-accent-stroke:/)
  assert.match(source, /--node-accent-stroke-strong:/)
})
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```bash
node --test test/node-type-style-contract.test.js
```

Expected: FAIL because the new preset classes and override variables do not exist yet.

- [ ] **Step 3: Implement the preset CSS with Flexoki-inspired defaults**

Replace the current dark-theme olive node palette with a neutral Flexoki-style base and add per-type preset variables. Keep `decision` as the only tall node. `start`, `end`, and `input` should keep the standard 46px height.

```css
:root {
  --node-fill: #f2efe7;
  --node-stroke: #b7b0a2;
  --node-stroke-strong: #87807a;
}

body.vscode-dark,
body.vscode-high-contrast {
  --node-fill: #2b2a27;
  --node-stroke: #57524a;
  --node-stroke-strong: #87807a;
}

.diagram-node {
  --node-accent-fill: var(--node-fill);
  --node-accent-stroke: var(--node-stroke);
  --node-accent-stroke-strong: var(--node-stroke-strong);
  border: 1.4px solid var(--node-accent-stroke);
  background: var(--node-accent-fill);
}

.diagram-node--type-default {}

.diagram-node--type-decision {
  min-height: 86px;
  border: 0;
  background: transparent;
}

.diagram-node--type-start {
  border-radius: 16px;
  --node-accent-fill: #879a39;
  --node-accent-stroke: #66800b;
  --node-accent-stroke-strong: #536907;
}

.diagram-node--type-end {
  border-radius: 999px;
  --node-accent-fill: #d0a0c0;
  --node-accent-stroke: #a02f6f;
  --node-accent-stroke-strong: #8b1e5d;
}

.diagram-node--type-input {
  border: 0;
  background: transparent;
  box-shadow: none;
  --node-accent-fill: #8b7ec8;
  --node-accent-stroke: #5e409d;
  --node-accent-stroke-strong: #4f3a8a;
}
```

Render `decision` and `input` with pseudo-elements:

```css
.diagram-node--type-decision::before {
  transform: translate(-50%, -50%) rotate(45deg);
  border: 1.4px solid var(--node-accent-stroke);
  background: var(--node-accent-fill);
}

.diagram-node--type-input::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1.4px solid var(--node-accent-stroke);
  background: var(--node-accent-fill);
  transform: skewX(-16deg);
  border-radius: 12px;
}

.diagram-node__input,
.diagram-node__successor,
.diagram-node .react-flow__handle {
  border-color: var(--node-accent-stroke-strong);
}
```

Use slightly lighter Flexoki-inspired values in `:root` and darker ones in VS Code dark mode; do not use the old olive palette in the default node preset.

- [ ] **Step 4: Re-run the style contract test**

Run:

```bash
node --test test/node-type-style-contract.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the styling changes**

```bash
git add src/webview-app/index.css test/node-type-style-contract.test.js
git commit -m "feat: add flow node preset styling"
```

### Task 4: Update DSL Docs and Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/flow-syntax.md`

- [ ] **Step 1: Update the public DSL examples**

Refresh both docs to show:

```flow
node start "开始" type=start
node decision "需要工具？" type=decision
node done "结束" type=end colour=#d14d8b
node input "用户输入" type=input color=blue
```

Document the first five official presets and the `color` / `colour` override rule:

```md
- `type=default`：矩形
- `type=decision`：菱形
- `type=start`：圆角矩形
- `type=end`：胶囊形
- `type=input`：平行四边形
- `color=` / `colour=`：可选覆盖，仅支持颜色名或 `#hex`
```

- [ ] **Step 2: Run the full project verification**

Run:

```bash
npm test
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 3: Inspect the final diff before commit**

Run:

```bash
git diff --stat HEAD~3..HEAD
git status --short
```

Expected: only the planned source, test, and doc files are changed.

- [ ] **Step 4: Commit the docs and verification pass**

```bash
git add README.md docs/flow-syntax.md
git commit -m "docs: document flow node presets and color overrides"
```

- [ ] **Step 5: Create the final integration commit if the branch uses per-task commits**

If you want a single end-user-facing commit after the task commits above, squash or re-commit per local workflow. Otherwise skip this step and keep the three feature commits plus one docs commit.

```bash
git log --oneline -4
```

Expected: visible commits for DSL parsing, mapping, styling, and docs.

