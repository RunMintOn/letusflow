export function applyGroupMargins(graph, layout) {
  if (!(graph.groups?.length)) {
    return layout
  }

  const nextLayout = {
    nodes: Object.fromEntries(
      Object.entries(layout.nodes).map(([nodeId, box]) => [nodeId, { ...box }]),
    ),
    ...(layout.edgeLabels ? { edgeLabels: { ...layout.edgeLabels } } : {}),
  }

  for (const group of graph.groups) {
    const members = graph.nodes
      .filter((node) => node.groupId === group.id)
      .map((node) => ({ node, box: nextLayout.nodes[node.id] }))
      .filter((entry) => entry.box)

    if (members.length < 2) {
      continue
    }

    const averageX = Math.round(members.reduce((sum, entry) => sum + entry.box.x, 0) / members.length)
    const averageY = Math.round(members.reduce((sum, entry) => sum + entry.box.y, 0) / members.length)
    const isVertical = graph.direction === 'TD' || graph.direction === 'TB'

    for (const { box } of members) {
      if (isVertical) {
        box.x = Math.round((box.x + averageX) / 2)
      } else {
        box.y = Math.round((box.y + averageY) / 2)
      }
    }
  }

  return nextLayout
}
