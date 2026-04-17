import { autoLayoutGraph } from './layout.js'
import {
  createDefaultEdgeLayout,
  createDefaultGroupLayout,
  createDefaultNodeLayout,
  createEmptyLayoutDocument,
  normalizeLayoutDocument,
} from './layoutSchema.js'
import { deriveDefaultGroupBox, separateGroupLayouts } from './groupLayout.js'

export function reconcileLayout(graph, currentLayout) {
  const normalized = normalizeLayoutDocument(currentLayout ?? createEmptyLayoutDocument())
  const autoLayout = autoLayoutGraph(graph)

  const nodes = Object.fromEntries(
    graph.nodes.map((node) => [
      node.id,
      normalized.nodes[node.id]
        ? createDefaultNodeLayout(normalized.nodes[node.id])
        : createDefaultNodeLayout(autoLayout.nodes?.[node.id]),
    ]),
  )

  const autoDerivedGroupIds = []
  const groups = Object.fromEntries(
    (graph.groups ?? []).map((group) => {
      if (normalized.groups[group.id]) {
        return [
          group.id,
          createDefaultGroupLayout(normalized.groups[group.id]),
        ]
      }

      autoDerivedGroupIds.push(group.id)
      return [
        group.id,
        deriveDefaultGroupBox(group.id, graph.nodes, nodes) ?? createDefaultGroupLayout(),
      ]
    }),
  )

  const edges = Object.fromEntries(
    (graph.edges ?? []).map((edge) => [
      edge.id,
      createDefaultEdgeLayout(normalized.edges[edge.id] ?? autoLayout.edges?.[edge.id]),
    ]),
  )

  const nextLayout = separateGroupLayouts({
    version: 1,
    nodes,
    groups,
    edges,
    edgeLabels: autoLayout.edgeLabels ?? {},
  }, graph, autoDerivedGroupIds)

  return nextLayout
}
