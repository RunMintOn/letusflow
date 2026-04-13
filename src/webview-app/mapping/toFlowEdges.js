const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 1.2,
}

const READ_EDGE_LABEL_STYLE = {
  fill: '#55555f',
  fontSize: 11,
  fontWeight: 400,
}

const READ_EDGE_MARKER = {
  type: 'arrowclosed',
  color: '#6f6f78',
}

export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge) => {
    const flowEdge = {
      id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'straight',
      markerEnd: READ_EDGE_MARKER,
      style: READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
    }

    if (edge.style === 'dashed') {
      flowEdge.animated = false
      flowEdge.style = { ...READ_EDGE_STYLE, strokeDasharray: '4 4' }
    }

    return flowEdge
  })
}
