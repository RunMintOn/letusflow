import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('app wires group creation and group editor support', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /FloatingGroupEditor/)
  assert.match(source, /type:\s*'createGroup'/)
  assert.match(source, /type:\s*'renameGroup'/)
  assert.match(source, /type:\s*'dragGroup'/)
  assert.match(source, /resolveAbsoluteNodeLayout/)
  assert.match(source, /fromNodeDragMessage\(node,\s*absoluteLayoutPosition\)/)
  assert.doesNotMatch(source, /findStrictDropGroupId/)
  assert.doesNotMatch(source, /type:\s*'moveNodeToGroup'/)
})

test('floating canvas controls expose a create group action', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.match(source, /新增分组/)
  assert.match(source, /onCreateGroup/)
})

test('group node exposes selected and dragging state hooks for visual feedback', async () => {
  const source = await readFile('src/webview-app/components/nodes/GroupNode.jsx', 'utf8')

  assert.match(source, /selected/)
  assert.match(source, /dragging/)
  assert.match(source, /is-selected/)
  assert.match(source, /is-dragging/)
})

test('group node exposes edge resize controls and forwards resize events', async () => {
  const source = await readFile('src/webview-app/components/nodes/GroupNode.jsx', 'utf8')
  const appSource = await readFile('src/webview-app/App.jsx', 'utf8')
  const hostSource = await readFile('src/extension-helpers/resolveCustomFlowEditor.js', 'utf8')

  assert.match(source, /NodeResizeControl/)
  assert.match(source, /ResizeControlVariant\.Line/)
  assert.match(source, /onResizeEnd/)
  assert.match(source, /onResizeGroup/)
  assert.doesNotMatch(source, /NodeResizer/)
  assert.match(appSource, /handleGroupResizeEnd/)
  assert.match(appSource, /type:\s*'resizeGroup'/)
  assert.match(hostSource, /message\?\.type === 'resizeGroup'/)
})

test('group selection is limited to the label and frame resize lines', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')
  const cssSource = await readFile('src/webview-app/index.css', 'utf8')

  assert.match(source, /isInteractiveGroupHit/)
  assert.match(source, /group-node__label/)
  assert.match(source, /group-node__resize-line/)
  assert.match(source, /if \(node\.type === 'groupNode' && !isInteractiveGroupHit\(_event\)\)/)
  assert.match(cssSource, /\.react-flow__node\.diagram-flow-group\s*\{[\s\S]*pointer-events:\s*none;/)
  assert.match(cssSource, /\.react-flow__node\.diagram-flow-group\s+\.group-node__label[\s\S]*pointer-events:\s*auto;/)
})
