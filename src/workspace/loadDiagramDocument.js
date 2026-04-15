import { autoLayoutGraph } from '../model/layout.js'
import { parseDiagram } from '../model/parseDiagram.js'
import { withEdgeIds } from '../model/withEdgeIds.js'

export async function loadDiagramDocumentFromSource(sourcePath, sourceText) {
  const graph = withEdgeIds(parseDiagram(sourceText))
  const layout = autoLayoutGraph(graph)

  return {
    sourcePath,
    sourceText,
    graph,
    layout,
  }
}

export async function loadDiagramDocument(fsLike, sourcePath) {
  const sourceText = await fsLike.readFile(sourcePath)
  return loadDiagramDocumentFromSource(sourcePath, sourceText)
}
