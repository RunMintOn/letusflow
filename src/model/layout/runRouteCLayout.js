import { buildDiagramIr } from '../diagramIr/buildDiagramIr.js'
import { buildRoutingResult } from '../routing/buildRoutingResult.js'
import { toFlowViewModel } from '../view-model/toFlowViewModel.js'
import { buildElkGraph } from './buildElkGraph.js'
import { extractLayoutResult } from './extractLayoutResult.js'
import {
  applyTopLevelGroupBandRoutingShifts,
  normalizeTopLevelGroupBands,
} from './normalizeTopLevelGroupBands.js'
import { runElkLayout } from './runElkLayout.js'

export async function runRouteCLayout(graph) {
  const ir = buildDiagramIr(graph)
  const elkGraph = buildElkGraph(ir)
  const layoutedGraph = await runElkLayout(elkGraph)
  const rawLayoutResult = extractLayoutResult(layoutedGraph)
  const layoutResult = normalizeTopLevelGroupBands(ir, rawLayoutResult)
  const rawRoutingResult = buildRoutingResult(layoutedGraph)
  const routingResult = applyTopLevelGroupBandRoutingShifts(
    ir,
    rawLayoutResult,
    layoutResult,
    rawRoutingResult,
  )

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
