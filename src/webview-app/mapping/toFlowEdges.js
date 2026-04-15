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

export function toFlowEdges(graphEdges, graphNodesOrLayout = [], layoutMaybe) {
  const graphNodes = Array.isArray(graphNodesOrLayout) ? graphNodesOrLayout : []
  const layout = Array.isArray(graphNodesOrLayout) ? layoutMaybe : graphNodesOrLayout
  const nodesById = new Map(graphNodes.map((node) => [node.id, node]))

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
    const flowEdge = {
      id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'readEdge',
      markerEnd: READ_EDGE_MARKER,
      style: READ_EDGE_STYLE,
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 2,
      labelStyle: READ_EDGE_LABEL_STYLE,
      data: {
        edgeRef,
        ...(sourceNode ? { sourceNode } : {}),
        ...(targetNode ? { targetNode } : {}),
      },
    }

    if (edge.style && EDGE_STYLE_MAP[edge.style]) {
      flowEdge.animated = false
      flowEdge.style = { ...flowEdge.style, ...EDGE_STYLE_MAP[edge.style] }
    }

    return flowEdge
  })
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
