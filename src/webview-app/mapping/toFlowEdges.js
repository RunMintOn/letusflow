const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 1.2,
}
const FEEDBACK_EDGE_STYLE = {
  ...READ_EDGE_STYLE,
  opacity: 0.72,
}
const FEEDBACK_EDGE_PATH_OPTIONS = {
  borderRadius: 12,
  offset: 48,
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

export function toFlowEdges(graphEdges, layout, direction = 'LR') {
  return graphEdges.map((edge) => {
    const isFeedback = isFeedbackEdge(edge, layout, direction)
    const edgeRef = {
      from: edge.from,
      to: edge.to,
      label: edge.label,
    }
    if (edge.style) {
      edgeRef.style = edge.style
    }

    const flowEdge = {
      id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: isFeedback ? 'smoothstep' : 'straight',
      markerEnd: READ_EDGE_MARKER,
      style: isFeedback ? FEEDBACK_EDGE_STYLE : READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
      data: {
        edgeRef,
      },
    }

    if (isFeedback) {
      flowEdge.className = 'diagram-flow-edge--feedback'
      flowEdge.pathOptions = FEEDBACK_EDGE_PATH_OPTIONS
    }

    if (edge.style === 'dashed') {
      flowEdge.animated = false
      flowEdge.style = { ...flowEdge.style, strokeDasharray: '4 4' }
    }

    return flowEdge
  })
}

function isFeedbackEdge(edge, layout, direction) {
  const sourceLayout = layout?.nodes?.[edge.from]
  const targetLayout = layout?.nodes?.[edge.to]

  if (!sourceLayout || !targetLayout) {
    return false
  }

  if (direction === 'TD' || direction === 'TB') {
    return targetLayout.y < sourceLayout.y
  }

  return targetLayout.x < sourceLayout.x
}
