import { parseDiagram } from '../model/parseDiagram.js'
import { reconcileLayout } from '../model/reconcileLayout.js'
import { serializeDiagram } from '../model/serializeDiagram.js'
import { withEdgeIds } from '../model/withEdgeIds.js'
import { loadLayoutDocument } from './loadLayoutDocument.js'
import { toLayoutPath } from './toLayoutPath.js'

export async function loadDiagramDocumentFromSource(sourcePath, sourceText, currentLayout = null) {
  const graph = withEdgeIds(parseDiagram(sourceText))
  const layoutPath = toLayoutPath(sourcePath)
  const layout = reconcileLayout(graph, currentLayout)

  return {
    sourcePath,
    layoutPath,
    sourceText: serializeDiagram(graph),
    graph,
    layout,
  }
}

export async function loadDiagramDocument(fsLike, sourcePath) {
  const sourceText = await fsLike.readFile(sourcePath)
  const graph = withEdgeIds(parseDiagram(sourceText))
  const layoutPath = toLayoutPath(sourcePath)
  const persistedLayout = await loadLayoutDocument(fsLike, layoutPath)
  const layout = reconcileLayout(graph, persistedLayout)

  return {
    sourcePath,
    layoutPath,
    sourceText: serializeDiagram(graph),
    graph,
    layout,
  }
}
