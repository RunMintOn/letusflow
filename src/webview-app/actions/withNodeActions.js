export function withNodeActions(nodes, actions) {
  return nodes.map((node) => {
    if (node.type !== 'diagramNode') {
      return node
    }

    const isEditing = node.id === actions.editingNodeId

    return {
      ...node,
      draggable: Boolean(actions.isNodeDraggingEnabled) && !isEditing,
      data: {
        ...node.data,
        onCreateSuccessor: actions.onCreateSuccessor,
        isEditing,
        editingLabel: isEditing ? actions.editingLabel : node.data.label,
        onEditChange: actions.onEditChange,
        onEditSubmit: actions.onEditSubmit,
        onEditCancel: actions.onEditCancel,
      },
    }
  })
}
