const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 1.2,
}
const FEEDBACK_EDGE_STYLE = {
  ...READ_EDGE_STYLE,
  opacity: 0.72,
}
const CONVERGING_EDGE_OFFSET_STEP = 8
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
  const readRoutes = toReadRoutes(graphEdges, layout, direction, feedbackRoutes, edgeRenderMode)

  return graphEdges.map((edge) => {
    const feedbackRoute = feedbackRoutes.get(edge)
    const isFeedback = Boolean(feedbackRoute)
    const readRoute = readRoutes.get(edge)
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
      type: isFeedback ? 'feedbackEdge' : 'readEdge',
      markerEnd: READ_EDGE_MARKER,
      style: isFeedback ? FEEDBACK_EDGE_STYLE : READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
      data: {
        edgeRef,
        ...(readRoute ? { readRoute } : {}),
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

function toReadRoutes(graphEdges, layout, direction, feedbackRoutes, edgeRenderMode) {
  const groups = new Map()
  const targetSide = toDefaultTargetSide(direction)

  for (const edge of graphEdges) {
    if (feedbackRoutes.get(edge)) {
      continue
    }

    const groupKey = `${edge.to}:${targetSide}`
    const group = groups.get(groupKey) ?? []
    group.push(edge)
    groups.set(groupKey, group)
  }

  const readRoutes = new Map()
  for (const [groupKey, edges] of groups.entries()) {
    const orderedEdges = orderConvergingEdges(edges, layout, targetSide)
    for (const [index, edge] of orderedEdges.entries()) {
      readRoutes.set(edge, {
        renderMode: edgeRenderMode,
        targetSide,
        targetOffset: toGroupedOffset(index, orderedEdges.length),
      })
    }
  }

  return readRoutes
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

function toDefaultTargetSide(direction) {
  if (direction === 'TD' || direction === 'TB') {
    return 'top'
  }

  return 'left'
}

function orderConvergingEdges(edges, layout, targetSide) {
  const nodeLayouts = layout?.nodes ?? {}
  const axis = targetSide === 'top' || targetSide === 'bottom' ? 'x' : 'y'

  return [...edges].sort((leftEdge, rightEdge) => {
    const leftLayout = nodeLayouts[leftEdge.from]
    const rightLayout = nodeLayouts[rightEdge.from]
    const leftValue = toCenterAxisValue(leftLayout, axis)
    const rightValue = toCenterAxisValue(rightLayout, axis)

    if (leftValue !== rightValue) {
      return leftValue - rightValue
    }

    return toStableEdgeId(leftEdge).localeCompare(toStableEdgeId(rightEdge))
  })
}

function toCenterAxisValue(nodeLayout, axis) {
  if (!nodeLayout) {
    return 0
  }

  if (axis === 'x') {
    return nodeLayout.x + nodeLayout.w / 2
  }

  return nodeLayout.y + nodeLayout.h / 2
}

function toGroupedOffset(index, count) {
  if (count <= 1) {
    return 0
  }

  return Math.round((index - (count - 1) / 2) * CONVERGING_EDGE_OFFSET_STEP)
}

function toStableEdgeId(edge) {
  return `${edge.from}->${edge.to}#${edge.label ?? ''}`
}
