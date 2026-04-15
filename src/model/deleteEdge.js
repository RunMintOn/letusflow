import { edgeMatchesRef } from './edgeRef.js'

export function deleteEdge(graph, edgeIdentity) {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => !edgeMatchesIdentity(edge, edgeIdentity)),
  }
}

function edgeMatchesIdentity(edge, edgeIdentity) {
  if (edgeIdentity?.edgeId) {
    return edge.id === edgeIdentity.edgeId
  }

  return edgeMatchesRef(edge, edgeIdentity)
}
