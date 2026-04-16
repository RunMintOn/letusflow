export function deleteGroup(graph, groupId) {
  return {
    ...graph,
    groups: (graph.groups ?? []).filter((group) => group.id !== groupId),
    nodes: (graph.nodes ?? []).map((node) =>
      node.groupId === groupId
        ? { ...node, groupId: undefined }
        : node
    ),
  }
}
