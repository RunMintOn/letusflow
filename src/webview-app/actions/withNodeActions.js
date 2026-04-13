export function withNodeActions(nodes, actions) {
  return nodes.map((node) => {
    if (node.type !== 'diagramNode') {
      return node
    }

    return {
      ...node,
      data: {
        ...node.data,
        onCreateSuccessor: actions.onCreateSuccessor,
      },
    }
  })
}
