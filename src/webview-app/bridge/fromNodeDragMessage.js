export function fromNodeDragMessage(node) {
  return {
    type: 'saveNodeLayout',
    nodeId: node.id,
    layout: {
      x: node.position.x,
      y: node.position.y,
      w: node.width ?? node.measured?.width ?? node.style?.width ?? 140,
      h: node.height ?? node.measured?.height ?? node.style?.height ?? 56,
    },
  }
}
