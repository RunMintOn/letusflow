export function fromNodeChanges(changes, currentNodes) {
  const positionById = new Map(currentNodes.map((node) => [node.id, node.position]))

  return changes
    .filter((change) => change.type === 'position' && change.position)
    .map((change) => ({
      id: change.id,
      position: change.position ?? positionById.get(change.id),
    }))
    .filter((change) => change.position)
}
