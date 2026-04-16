const READ_EDGE_STYLE = {
  stroke: '#6f6f78',
  strokeWidth: 2,
}

const READ_EDGE_LABEL_STYLE = {
  fill: '#55555f',
  fontSize: 12,
  fontWeight: 500,
}

const READ_EDGE_MARKER = {
  type: 'arrowclosed',
  color: '#6f6f78',
}

const EDGE_STYLE_MAP = {
  dashed: { strokeDasharray: '4 4' },
  dotted: { strokeDasharray: '1 4' },
  dashdot: { strokeDasharray: '4 2 1 2' },
}

function buildParallelEdgeGroups(graphEdges) {
  const groups = new Map()

  for (const edge of graphEdges) {
    const key = `${edge.from}=>${edge.to}`
    const group = groups.get(key) ?? []
    group.push(edge)
    groups.set(key, group)
  }

  return groups
}

function toParallelIndex(index, count) {
  return index - (count - 1) / 2
}

export function toFlowEdges(graphEdges, graphNodesOrLayout = [], layoutMaybe) {
  const graphNodes = Array.isArray(graphNodesOrLayout) ? graphNodesOrLayout : []
  const layout = Array.isArray(graphNodesOrLayout) ? layoutMaybe : graphNodesOrLayout
  const nodesById = new Map(graphNodes.map((node) => [node.id, node]))
  const parallelGroups = buildParallelEdgeGroups(graphEdges)

  return graphEdges.map((edge) => {
    const edgeRef = {
      from: edge.from,
      to: edge.to,
      label: edge.label,
    }

    if (edge.style) {
      edgeRef.style = edge.style
    }

    const sourceNode = toEdgeEndpointNode(nodesById.get(edge.from), layout?.nodes?.[edge.from])
    const targetNode = toEdgeEndpointNode(nodesById.get(edge.to), layout?.nodes?.[edge.to])
    const edgeId = edge.id ?? `${edge.from}->${edge.to}#${edge.label ?? ''}`
    const edgeLayout = layout?.edges?.[edgeId] ?? null
    const parallelGroup = parallelGroups.get(`${edge.from}=>${edge.to}`) ?? [edge]
    const parallelPosition = parallelGroup.findIndex((candidate) => (candidate.id ?? candidate) === (edge.id ?? edge))
    const parallelCount = parallelGroup.length
    const parallelIndex = toParallelIndex(
      parallelPosition === -1 ? 0 : parallelPosition,
      parallelCount,
    )
    const flowEdge = {
      id: edgeId,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'readEdge',
      markerEnd: READ_EDGE_MARKER,
      style: READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
      ...(edgeLayout ? { sourceHandle: toHandleId(edgeLayout.sourceSide, 'source') } : {}),
      ...(edgeLayout ? { targetHandle: toHandleId(edgeLayout.targetSide, 'target') } : {}),
      data: {
        edgeId,
        parallelIndex,
        parallelCount,
        edgeRef,
        ...(sourceNode ? { sourceNode } : {}),
        ...(targetNode ? { targetNode } : {}),
        ...(layout?.edgeLabels?.[edgeId] ? { labelLayout: layout.edgeLabels[edgeId] } : {}),
      },
    }

    if (edge.style && EDGE_STYLE_MAP[edge.style]) {
      flowEdge.animated = false
      flowEdge.style = { ...flowEdge.style, ...EDGE_STYLE_MAP[edge.style] }
    }

    return flowEdge
  })
}

function toHandleId(side, type) {
  const resolvedSide = typeof side === 'string' && side ? side : type === 'source' ? 'right' : 'left'
  return `${resolvedSide}-${type}`
}

function toEdgeEndpointNode(node, layoutNode) {
  if (!node || !layoutNode) {
    return null
  }

  return {
    nodeType: node.type ?? 'default',
    x: layoutNode.x,
    y: layoutNode.y,
    w: layoutNode.w,
    h: layoutNode.h,
  }
}
