import { edgeMatchesRef } from './edgeRef.js'

export function reconnectEdge(graph, edgeIdentity, nextConnection) {
  return {
    ...graph,
    edges: graph.edges.map((edge) =>
      edgeMatchesIdentity(edge, edgeIdentity)
        ? {
            ...edge,
            from: nextConnection.from,
            to: nextConnection.to,
          }
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
