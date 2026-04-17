export function applyLiveGroupDrag(nodes, draggedGroupNode) {
  const currentGroupNode = (nodes ?? []).find((node) => node.id === draggedGroupNode.id)
  if (!currentGroupNode) {
    return nodes
  }

  const delta = {
    x: draggedGroupNode.position.x - currentGroupNode.position.x,
    y: draggedGroupNode.position.y - currentGroupNode.position.y,
  }

  if (!delta.x && !delta.y) {
    return nodes
  }

  return nodes.map((node) => {
    if (node.id === draggedGroupNode.id) {
      return {
        ...node,
        position: draggedGroupNode.position,
      }
    }

    if (draggedGroupNode.data.memberNodeIds?.includes(node.id)) {
      return {
        ...node,
        position: {
          x: node.position.x + delta.x,
          y: node.position.y + delta.y,
        },
      }
    }

    return node
  })
}
