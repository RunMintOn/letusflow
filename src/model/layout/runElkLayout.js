import ELK from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

export async function runElkLayout(elkGraph) {
  return elk.layout(elkGraph)
}
