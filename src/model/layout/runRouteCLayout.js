import { buildDiagramIr } from '../diagramIr/buildDiagramIr.js'
import { buildRoutingResult } from '../routing/buildRoutingResult.js'
import { toFlowViewModel } from '../view-model/toFlowViewModel.js'
import { buildElkGraph } from './buildElkGraph.js'
import { extractLayoutResult } from './extractLayoutResult.js'
import { runElkLayout } from './runElkLayout.js'

export async function runRouteCLayout(graph) {
  const ir = buildDiagramIr(graph)
  const elkGraph = buildElkGraph(ir)
  const layoutedGraph = await runElkLayout(elkGraph)
  const layoutResult = extractLayoutResult(layoutedGraph)
  const routingResult = buildRoutingResult(layoutedGraph)

  return {
    ir,
    layoutResult,
    routingResult,
    viewModel: toFlowViewModel({
      graph: ir,
      layoutResult,
      routingResult,
    }),
  }
}
