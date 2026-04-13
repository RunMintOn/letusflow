export function toFlowNodes(graphNodes, layout) {
  return graphNodes.map((node) => ({
    id: node.id,
    type: 'diagramNode',
    position: {
      x: layout.nodes[node.id].x,
      y: layout.nodes[node.id].y,
    },
    data: {
      label: node.label,
    },
    style: {
      width: layout.nodes[node.id].w,
      height: layout.nodes[node.id].h,
    },
  }))
}
