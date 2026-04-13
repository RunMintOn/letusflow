import { edgeMatchesRef } from './edgeRef.js'

export function renameEdgeLabel(graph, edgeRef, nextLabel) {
  return {
    ...graph,
    edges: graph.edges.map((edge) =>
      edgeMatchesRef(edge, edgeRef)
        ? { ...edge, label: nextLabel || undefined }
        : edge,
    ),
  }
}
