import { createEdgeId } from './withEdgeIds.js'

export function createEdge(graph, edge) {
  const nextEdge = edge.id
    ? edge
    : { ...edge, id: createEdgeId(graph.edges) }

  return {
    ...graph,
    edges: [...graph.edges, nextEdge],
  }
}
