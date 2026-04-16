import { toNodeHandlePositions } from '../../webview-app/mapping/toNodeHandlePositions.js'

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

export function toFlowViewModel({ graph, layoutResult, routingResult }) {
  const handlePositions = toNodeHandlePositions(graph.direction)

  const nodes = graph.nodes.map((node) => {
    const layoutNode = layoutResult.nodes[node.id]

    return {
      id: node.id,
      type: 'diagramNode',
      className: 'diagram-flow-node',
      position: {
        x: layoutNode.x,
        y: layoutNode.y,
      },
      data: {
        label: node.label,
        nodeType: node.type ?? 'default',
        ...((node.color ?? node.style?.color) ? { nodeColor: node.color ?? node.style?.color } : {}),
        ...handlePositions,
      },
      style: {
        width: layoutNode.w,
        height: layoutNode.h,
      },
    }
  })

  const groups = Object.entries(layoutResult.groups ?? {}).map(([groupId, box]) => ({
    id: `group:${groupId}`,
    type: 'groupNode',
    className: 'diagram-flow-group',
    position: {
      x: box.x,
      y: box.y,
    },
    data: {
      label: box.label,
    },
    draggable: false,
    selectable: false,
    style: {
      width: box.w,
      height: box.h,
    },
  }))

  const edges = graph.edges.map((edge) => ({
    id: edge.id,
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
      edgeId: edge.id,
      edgeRef: {
        from: edge.from,
        to: edge.to,
        label: edge.label,
        ...(edge.style ? { style: edge.style } : {}),
      },
      sections: routingResult.sectionsByEdgeId[edge.id] ?? [],
      labelLayout: routingResult.labelBoxesByEdgeId[edge.id] ?? null,
    },
  }))

  return {
    nodes,
    groups,
    edges,
  }
}
