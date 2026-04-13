export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge) => {
    const flowEdge = {
      id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'smoothstep',
    }

    if (edge.style === 'dashed') {
      flowEdge.animated = false
      flowEdge.style = { strokeDasharray: '6 6' }
    }

    return flowEdge
  })
}
