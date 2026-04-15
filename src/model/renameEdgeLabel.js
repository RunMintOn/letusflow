import { edgeMatchesRef } from './edgeRef.js'

export function renameEdgeLabel(graph, edgeIdentity, nextLabel) {
  return {
    ...graph,
    edges: graph.edges.map((edge) =>
      edgeMatchesIdentity(edge, edgeIdentity)
        ? { ...edge, label: nextLabel || undefined }
        : edge,
    ),
  }
}

function edgeMatchesIdentity(edge, edgeIdentity) {
  if (edgeIdentity?.edgeId) {
    return edge.id === edgeIdentity.edgeId
  }

  return edgeMatchesRef(edge, edgeIdentity)
}
