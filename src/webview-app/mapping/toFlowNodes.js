import { toNodeHandlePositions } from './toNodeHandlePositions.js'

const DEFAULT_LAYOUT = {
  x: 10,
  y: 20,
  w: 140,
  h: 56,
}
const GROUP_PADDING_X = 24
const GROUP_PADDING_TOP = 42
const GROUP_PADDING_BOTTOM = 24

export function toFlowNodes(graphOrNodes, layout) {
  const graphNodes = Array.isArray(graphOrNodes) ? graphOrNodes : graphOrNodes.nodes
  const graphGroups = Array.isArray(graphOrNodes) ? [] : graphOrNodes.groups ?? []
  const handlePositions = toNodeHandlePositions(Array.isArray(graphOrNodes) ? 'LR' : graphOrNodes.direction)
  const diagramNodes = graphNodes.map((node) => {
    const nodeLayout = layout?.nodes?.[node.id] ?? DEFAULT_LAYOUT

    return {
      id: node.id,
      type: 'diagramNode',
      className: 'diagram-flow-node',
      position: {
        x: nodeLayout.x,
        y: nodeLayout.y,
      },
      data: {
        label: node.label,
        nodeType: node.type ?? 'default',
        ...(node.color ? { nodeColor: node.color } : {}),
        ...handlePositions,
      },
      style: {
        width: nodeLayout.w,
        height: nodeLayout.h,
      },
    }
  })

  const groupNodes = graphGroups
    .map((group) => toGroupNode(group, graphNodes, layout))
    .filter(Boolean)

  return [...groupNodes, ...diagramNodes]
}

function toGroupNode(group, graphNodes, layout) {
  const childLayouts = graphNodes
    .filter((node) => node.groupId === group.id)
    .map((node) => layout?.nodes?.[node.id])
    .filter(Boolean)

  if (childLayouts.length === 0) {
    return null
  }

  const minX = Math.min(...childLayouts.map((nodeLayout) => nodeLayout.x))
  const minY = Math.min(...childLayouts.map((nodeLayout) => nodeLayout.y))
  const maxX = Math.max(...childLayouts.map((nodeLayout) => nodeLayout.x + nodeLayout.w))
  const maxY = Math.max(...childLayouts.map((nodeLayout) => nodeLayout.y + nodeLayout.h))

  return {
    id: `group:${group.id}`,
    type: 'groupNode',
    className: 'diagram-flow-group',
    position: {
      x: minX - GROUP_PADDING_X,
      y: minY - GROUP_PADDING_TOP,
    },
    data: {
      label: group.label,
    },
    draggable: false,
    selectable: false,
    style: {
      width: maxX - minX + GROUP_PADDING_X * 2,
      height: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
    },
  }
}
