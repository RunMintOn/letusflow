export function withNodeActions(nodes, actions) {
  return nodes.map((node) => {
    const isGroupNode = node.type === 'groupNode'
    const isDiagramNode = node.type === 'diagramNode'

    if (!isDiagramNode && !isGroupNode) {
      return node
    }

    const isEditing = node.id === actions.editingNodeId

    return {
      ...node,
      draggable: Boolean(actions.isNodeDraggingEnabled) && !isEditing,
      data: {
        ...node.data,
        ...(isDiagramNode ? { onCreateSuccessor: actions.onCreateSuccessor } : {}),
        isEditing,
        editingLabel: isEditing ? actions.editingLabel : node.data.label,
        onEditChange: actions.onEditChange,
        onEditSubmit: actions.onEditSubmit,
        onEditCancel: actions.onEditCancel,
      },
    }
  })
}
