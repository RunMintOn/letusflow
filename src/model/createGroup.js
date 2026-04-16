export function createGroup(graph, group) {
  return {
    ...graph,
    groups: [...(graph.groups ?? []), group],
  }
}
