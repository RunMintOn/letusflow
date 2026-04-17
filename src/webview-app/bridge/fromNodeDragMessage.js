export function fromNodeDragMessage(node, layoutPosition = node.position) {
  return {
    type: 'saveNodeLayout',
    nodeId: node.id,
    layout: {
      x: layoutPosition.x,
      y: layoutPosition.y,
      w: node.width ?? node.measured?.width ?? node.style?.width ?? 140,
      h: node.height ?? node.measured?.height ?? node.style?.height ?? 56,
    },
  }
}
