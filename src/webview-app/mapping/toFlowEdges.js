const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 1.2,
}
const FEEDBACK_EDGE_STYLE = {
  ...READ_EDGE_STYLE,
  opacity: 0.72,
}
const FEEDBACK_LANE_GAP = 48
const FEEDBACK_LANE_SPACING = 28
const FEEDBACK_EDGE_ENDPOINT_OFFSET = 24

const READ_EDGE_LABEL_STYLE = {
  fill: '#55555f',
  fontSize: 11,
  fontWeight: 400,
}

const READ_EDGE_MARKER = {
  type: 'arrowclosed',
  color: '#6f6f78',
}

export function toFlowEdges(graphEdges, layout, direction = 'LR', edgeRenderMode = 'straight') {
  const feedbackRoutes = toFeedbackRoutes(graphEdges, layout, direction)

  return graphEdges.map((edge) => {
    const feedbackRoute = feedbackRoutes.get(edge)
    const isFeedback = Boolean(feedbackRoute)
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
      type: isFeedback ? 'feedbackEdge' : edgeRenderMode,
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
      flowEdge.data.feedbackRoute = feedbackRoute
    }

    if (edge.style === 'dashed') {
      flowEdge.animated = false
      flowEdge.style = { ...flowEdge.style, strokeDasharray: '4 4' }
    }

    return flowEdge
  })
}

function toFeedbackRoutes(graphEdges, layout, direction) {
  const graphBounds = getGraphBounds(layout)
  if (!graphBounds) {
    return new Map()
  }

  const feedbackRoutes = new Map()
  let feedbackIndex = 0

  for (const edge of graphEdges) {
    if (!isFeedbackEdge(edge, layout, direction)) {
      continue
    }

    feedbackRoutes.set(edge, toFeedbackRoute(graphBounds, direction, feedbackIndex))
    feedbackIndex += 1
  }

  return feedbackRoutes
}

function toFeedbackRoute(graphBounds, direction, feedbackIndex) {
  if (direction === 'TD' || direction === 'TB') {
    return {
      direction,
      laneX: graphBounds.minX - FEEDBACK_LANE_GAP - feedbackIndex * FEEDBACK_LANE_SPACING,
      sourceOffset: FEEDBACK_EDGE_ENDPOINT_OFFSET,
      targetOffset: FEEDBACK_EDGE_ENDPOINT_OFFSET,
    }
  }

  return {
    direction,
    laneY: graphBounds.minY - FEEDBACK_LANE_GAP - feedbackIndex * FEEDBACK_LANE_SPACING,
    sourceOffset: FEEDBACK_EDGE_ENDPOINT_OFFSET,
    targetOffset: FEEDBACK_EDGE_ENDPOINT_OFFSET,
  }
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

function getGraphBounds(layout) {
  const nodeLayouts = Object.values(layout?.nodes ?? {})
  if (nodeLayouts.length === 0) {
    return null
  }

  return {
    minX: Math.min(...nodeLayouts.map((nodeLayout) => nodeLayout.x)),
    minY: Math.min(...nodeLayouts.map((nodeLayout) => nodeLayout.y)),
  }
}
