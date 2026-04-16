import { createDefaultGroupLayout } from './layoutSchema.js'

const GROUP_PADDING_X = 24
const GROUP_PADDING_TOP = 42
const GROUP_PADDING_BOTTOM = 24

export function deriveDefaultGroupBox(groupId, graphNodes, nodeLayouts) {
  const childLayouts = graphNodes
    .filter((node) => node.groupId === groupId)
    .map((node) => nodeLayouts[node.id])
    .filter(Boolean)

  if (childLayouts.length === 0) {
    return null
  }

  const minX = Math.min(...childLayouts.map((layout) => layout.x))
  const minY = Math.min(...childLayouts.map((layout) => layout.y))
  const maxX = Math.max(...childLayouts.map((layout) => layout.x + layout.w))
  const maxY = Math.max(...childLayouts.map((layout) => layout.y + layout.h))

  return createDefaultGroupLayout({
    x: minX - GROUP_PADDING_X,
    y: minY - GROUP_PADDING_TOP,
    w: maxX - minX + GROUP_PADDING_X * 2,
    h: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
  })
}

export function shiftGroupWithChildren(layout, groupId, delta, graph) {
  const nextLayout = {
    ...layout,
    nodes: { ...(layout.nodes ?? {}) },
    groups: { ...(layout.groups ?? {}) },
  }

  const currentGroup = nextLayout.groups[groupId]
  if (!currentGroup) {
    return nextLayout
  }

  nextLayout.groups[groupId] = {
    ...currentGroup,
    x: currentGroup.x + delta.x,
    y: currentGroup.y + delta.y,
  }

  for (const node of graph.nodes ?? []) {
    if (node.groupId !== groupId) {
      continue
    }

    const currentNode = nextLayout.nodes[node.id]
    if (!currentNode) {
      continue
    }

    nextLayout.nodes[node.id] = {
      ...currentNode,
      x: currentNode.x + delta.x,
      y: currentNode.y + delta.y,
    }
  }

  return nextLayout
}

export function canDropNodeIntoGroup(nodeBox, groupBox) {
  const left = groupBox.x + 16
  const right = groupBox.x + groupBox.w - 16
  const top = groupBox.y + 40
  const bottom = groupBox.y + groupBox.h - 16

  return (
    nodeBox.x >= left &&
    nodeBox.y >= top &&
    nodeBox.x + nodeBox.w <= right &&
    nodeBox.y + nodeBox.h <= bottom
  )
}
