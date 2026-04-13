import { preserveLayout } from '../model/layout.js'
import { parseDiagram } from '../model/parseDiagram.js'

export async function loadDiagramDocument(fsLike, sourcePath) {
  const sourceText = await fsLike.readFile(sourcePath)
  const graph = parseDiagram(sourceText)
  const layoutPath = `${sourcePath}.layout.json`
  const previousLayout = await readOptionalJson(fsLike, layoutPath)
  const layout = preserveLayout(previousLayout, graph)

  return {
    sourcePath,
    layoutPath,
    sourceText,
    graph,
    layout,
  }
}

async function readOptionalJson(fsLike, path) {
  try {
    const text = await fsLike.readFile(path)
    return JSON.parse(text)
  } catch (error) {
    return { nodes: {} }
  }
}
