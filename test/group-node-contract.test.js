import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('app wires group creation and group editor support', async () => {
  const source = await readFile('src/webview-app/App.jsx', 'utf8')

  assert.match(source, /FloatingGroupEditor/)
  assert.match(source, /type:\s*'createGroup'/)
  assert.match(source, /type:\s*'renameGroup'/)
  assert.match(source, /type:\s*'dragGroup'/)
  assert.match(source, /type:\s*'moveNodeToGroup'/)
  assert.match(source, /handleNodeDrag/)
  assert.match(source, /applyLiveGroupDrag/)
})

test('floating canvas controls expose a create group action', async () => {
  const source = await readFile('src/webview-app/components/FloatingCanvasControls.jsx', 'utf8')

  assert.match(source, /新增分组/)
  assert.match(source, /onCreateGroup/)
})
