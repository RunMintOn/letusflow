export function moveNodeToGroup(graph, nodeId, groupId) {
  return {
    ...graph,
    nodes: (graph.nodes ?? []).map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...(groupId ? { groupId } : {}),
            ...(groupId ? {} : { groupId: undefined }),
          }
        : node
    ),
  }
}
