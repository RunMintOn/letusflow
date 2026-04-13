import test from 'node:test'
import assert from 'node:assert/strict'

import { toInspectorLayoutClass } from '../src/webview-app/components/inspectorLayout.js'

test('uses expanded inspector layout by default', () => {
  assert.equal(toInspectorLayoutClass(false), 'app-main')
})

test('uses collapsed inspector layout when requested', () => {
  assert.equal(toInspectorLayoutClass(true), 'app-main app-main--inspector-collapsed')
})
