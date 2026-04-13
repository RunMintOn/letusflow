const DEFAULT_LAYOUT = {
  x: 10,
  y: 20,
  w: 140,
  h: 56,
}

export function toFlowNodes(graphNodes, layout) {
  return graphNodes.map((node) => {
    const nodeLayout = layout?.nodes?.[node.id] ?? DEFAULT_LAYOUT

    return {
      id: node.id,
      type: 'diagramNode',
      position: {
        x: nodeLayout.x,
        y: nodeLayout.y,
      },
      data: {
        label: node.label,
      },
      style: {
        width: nodeLayout.w,
        height: nodeLayout.h,
      },
    }
  })
}
