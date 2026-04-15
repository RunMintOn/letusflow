import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('layout spacing slider sits under the auto-layout button as a compact top-right card', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')
  const rightCardBlock = source.match(/\.canvas-hud--right\s*\{([^}]*)\}/)?.[1] ?? ''
  const headerBlock = source.match(/\.canvas-slider__header\s*\{([^}]*)\}/)?.[1] ?? ''
  const wrapBlock = source.match(/\.canvas-slider__input-wrap\s*\{([^}]*)\}/)?.[1] ?? ''

  assert.ok(rightCardBlock, 'expected a .canvas-hud--right CSS block')
  assert.match(rightCardBlock, /top:\s*64px;/)
  assert.match(rightCardBlock, /right:\s*16px;/)
  assert.doesNotMatch(rightCardBlock, /translateY/)

  assert.ok(headerBlock, 'expected a .canvas-slider__header CSS block')
  assert.match(headerBlock, /justify-content:\s*space-between;/)

  assert.ok(wrapBlock, 'expected a .canvas-slider__input-wrap CSS block')
  assert.match(wrapBlock, /height:\s*112px;/)
})

test('narrow-width layout no longer collapses the right rail and action stack into one bottom slot', async () => {
  const source = await readFile('src/webview-app/index.css', 'utf8')

  assert.doesNotMatch(
    source,
    /@media \(max-width: 900px\)\s*\{\s*\.canvas-hud--bottom,\s*\.canvas-hud--right,\s*\.canvas-hud--actions/,
  )
  assert.match(source, /@media \(max-width: 640px\)/)
  assert.match(source, /@media \(max-width: 640px\)\s*\{\s*\.canvas-hud--bottom\s*\{/)
  assert.doesNotMatch(
    source,
    /@media \(max-width: 640px\)\s*\{\s*\.canvas-hud--bottom,\s*\.canvas-hud--right,\s*\.canvas-hud--actions/,
  )
})
