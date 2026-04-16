import { autoLayoutGraph } from '../model/layout.js'
import { runRouteCLayout } from '../model/layout/runRouteCLayout.js'
import { parseDiagram } from '../model/parseDiagram.js'
import { withEdgeIds } from '../model/withEdgeIds.js'

export async function loadDiagramDocumentFromSource(sourcePath, sourceText) {
  const graph = withEdgeIds(parseDiagram(sourceText))
  const layout = autoLayoutGraph(graph)
  const routeCResult = await runRouteCLayout(graph)

  return {
    sourcePath,
    sourceText,
    graph,
    layout,
    routeC: {
      enabled: true,
      viewModel: routeCResult.viewModel,
    },
  }
}

export async function loadDiagramDocument(fsLike, sourcePath) {
  const sourceText = await fsLike.readFile(sourcePath)
  return loadDiagramDocumentFromSource(sourcePath, sourceText)
}
