import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('docs describe the dual-file flow plus layout model', async () => {
  const readme = await readFile('README.md', 'utf8')
  const spec = await readFile('SPEC.md', 'utf8')
  const syntax = await readFile('docs/flow-syntax.md', 'utf8')

  assert.match(readme, /\.flow\.layout\.json/)
  assert.match(spec, /layout\.json/i)
  assert.match(syntax, /id=e_review_pass/)
})
