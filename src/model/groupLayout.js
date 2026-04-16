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
