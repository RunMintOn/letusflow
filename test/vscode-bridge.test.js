import test from 'node:test'
import assert from 'node:assert/strict'

import { getVsCodeApi } from '../src/webview-app/bridge/vscodeBridge.js'

test('caches the VS Code webview API after the first acquisition', () => {
  const originalAcquire = globalThis.acquireVsCodeApi
  let calls = 0
  const fakeApi = { postMessage() {} }

  globalThis.acquireVsCodeApi = () => {
    calls += 1
    return fakeApi
  }

  try {
    const first = getVsCodeApi()
    const second = getVsCodeApi()

    assert.equal(first, fakeApi)
    assert.equal(second, fakeApi)
    assert.equal(calls, 1)
  } finally {
    globalThis.acquireVsCodeApi = originalAcquire
  }
})
