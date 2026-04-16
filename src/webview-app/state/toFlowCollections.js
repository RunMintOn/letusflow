import { toFlowNodes } from '../mapping/toFlowNodes.js'
import { toFlowEdges } from '../mapping/toFlowEdges.js'

export function toFlowCollections(documentModel, activeLayout) {
  if (documentModel.routeC?.viewModel) {
    return {
      flowNodes: [
        ...(documentModel.routeC.viewModel.groups ?? []),
        ...(documentModel.routeC.viewModel.nodes ?? []),
      ],
      flowEdges: documentModel.routeC.viewModel.edges ?? [],
    }
  }

  return {
    flowNodes: toFlowNodes(documentModel.graph, activeLayout),
    flowEdges: toFlowEdges(
      documentModel.graph.edges,
      documentModel.graph.nodes,
      activeLayout,
    ),
  }
}
