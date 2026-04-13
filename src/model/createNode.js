export function createNode(graph, newNode) {
  return {
    ...graph,
    nodes: [...graph.nodes, newNode],
  }
}
