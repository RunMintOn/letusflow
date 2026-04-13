export function renameNodeLabel(graph, nodeId, nextLabel) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id !== nodeId) {
        return node
      }

      return {
        ...node,
        label: nextLabel,
      }
    }),
  }
}
