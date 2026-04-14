import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('package registers a default custom editor for .flow files', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.deepEqual(pkg.activationEvents, ['onCustomEditor:diagramEditor.flowEditor'])
  assert.ok(Array.isArray(pkg.contributes.customEditors))
  assert.deepEqual(pkg.contributes.customEditors, [
    {
      viewType: 'diagramEditor.flowEditor',
      displayName: 'Flow Diagram Editor',
      selector: [{ filenamePattern: '*.flow' }],
      priority: 'default',
    },
  ])
})

test('package no longer contributes the command-driven preview entrypoint', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(pkg.contributes.commands, undefined)
})
