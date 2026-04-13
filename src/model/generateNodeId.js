export function generateNodeId(existingNodes, baseLabel = 'node') {
  const existingIds = new Set(existingNodes.map((node) => node.id))
  if (!existingIds.has(baseLabel)) {
    return baseLabel
  }

  let index = 2
  while (existingIds.has(`${baseLabel}-${index}`)) {
    index += 1
  }

  return `${baseLabel}-${index}`
}
