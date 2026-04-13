import { autoLayoutGraph } from '../model/layout.js'
import { parseDiagram } from '../model/parseDiagram.js'

export async function loadDiagramDocument(fsLike, sourcePath) {
  const sourceText = await fsLike.readFile(sourcePath)
  const graph = parseDiagram(sourceText)
  const layout = autoLayoutGraph(graph)

  return {
    sourcePath,
    sourceText,
    graph,
    layout,
  }
}
