export function renameGroupLabel(graph, groupId, label) {
  return {
    ...graph,
    groups: (graph.groups ?? []).map((group) =>
      group.id === groupId
        ? { ...group, label }
        : group
    ),
  }
}
