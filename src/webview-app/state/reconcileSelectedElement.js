export function reconcileSelectedElement(selectedElement, nodes, edges) {
  if (!selectedElement) {
    return null
  }

  if (selectedElement.type === 'node') {
    return nodes.some((node) => node.id === selectedElement.id) ? selectedElement : null
  }

  if (selectedElement.type === 'edge') {
    const nextEdge = edges.find((edge) => edge.data?.edgeId === selectedElement.edgeId)
    if (!nextEdge) {
      return null
    }

    return {
      type: 'edge',
      id: nextEdge.id,
      edgeId: nextEdge.data.edgeId,
      edgeRef: nextEdge.data.edgeRef,
    }
  }

  return null
}
