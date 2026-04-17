const DEFAULT_NODE_WIDTH = 140
const DEFAULT_NODE_HEIGHT = 56

export function withLiveEdgeNodeGeometry(edges, nodes) {
  const nodesById = new Map(
    (nodes ?? []).map((node) => [node.id, node]),
  )

  return (edges ?? []).map((edge) => {
    const sourceNode = toLiveEndpointNode(nodesById.get(edge.source))
    const targetNode = toLiveEndpointNode(nodesById.get(edge.target))

    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        ...(sourceNode ? { sourceNode } : {}),
        ...(targetNode ? { targetNode } : {}),
      },
    }
  })
}

function toLiveEndpointNode(node) {
  if (!node || node.type !== 'diagramNode') {
    return null
  }

  return {
    nodeType: node.data?.nodeType ?? 'default',
    x: node.position?.x ?? 0,
    y: node.position?.y ?? 0,
    w: node.width ?? node.measured?.width ?? node.style?.width ?? DEFAULT_NODE_WIDTH,
    h: node.height ?? node.measured?.height ?? node.style?.height ?? DEFAULT_NODE_HEIGHT,
  }
}
