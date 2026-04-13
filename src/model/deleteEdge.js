import { edgeMatchesRef } from './edgeRef.js'

export function deleteEdge(graph, edgeRef) {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => !edgeMatchesRef(edge, edgeRef)),
  }
}
