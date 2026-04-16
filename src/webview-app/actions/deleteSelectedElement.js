export function deleteSelectedElement({ selectedElement, postToHost }) {
  if (!selectedElement) {
    return
  }

  if (selectedElement.type === 'node') {
    postToHost({ type: 'deleteNode', nodeId: selectedElement.id })
    return
  }

  if (selectedElement.type === 'group') {
    postToHost({ type: 'deleteGroup', groupId: selectedElement.groupId })
    return
  }

  if (selectedElement.type === 'edge') {
    postToHost({
      type: 'deleteEdge',
      edgeId: selectedElement.edgeId,
      edge: selectedElement.edgeRef,
    })
  }
}
