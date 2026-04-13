export function createEdge(graph, edge) {
  return {
    ...graph,
    edges: [...graph.edges, edge],
  }
}
