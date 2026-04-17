import { toNodeHandlePositions } from './toNodeHandlePositions.js'

const DEFAULT_LAYOUT = {
  x: 10,
  y: 20,
  w: 140,
  h: 56,
}

export function toFlowNodes(graphOrNodes, layout) {
  const graphNodes = Array.isArray(graphOrNodes) ? graphOrNodes : graphOrNodes.nodes
  const graphGroups = Array.isArray(graphOrNodes) ? [] : graphOrNodes.groups ?? []
  const handlePositions = toNodeHandlePositions(Array.isArray(graphOrNodes) ? 'LR' : graphOrNodes.direction)
  const groupLayouts = new Map(
    graphGroups
      .map((group) => [group.id, resolveGroupLayout(group, graphNodes, layout)])
      .filter(([, groupLayout]) => Boolean(groupLayout)),
  )
  const diagramNodes = graphNodes.map((node) => {
    const nodeLayout = layout?.nodes?.[node.id] ?? DEFAULT_LAYOUT
    const parentGroupLayout = node.groupId ? groupLayouts.get(node.groupId) : null
    const position = parentGroupLayout
      ? {
          x: nodeLayout.x - parentGroupLayout.x,
          y: nodeLayout.y - parentGroupLayout.y,
        }
      : {
          x: nodeLayout.x,
          y: nodeLayout.y,
        }

    return {
      id: node.id,
      type: 'diagramNode',
      className: 'diagram-flow-node',
      zIndex: 2,
      ...(node.groupId && parentGroupLayout ? { parentId: `group:${node.groupId}` } : {}),
      position,
      data: {
        label: node.label,
        nodeType: node.type ?? 'default',
        ...(node.groupId ? { groupId: node.groupId } : {}),
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
    .map((group) => toGroupNode(group, graphNodes, groupLayouts.get(group.id)))
    .filter(Boolean)

  return [...groupNodes, ...diagramNodes]
}

function toGroupNode(group, graphNodes, groupLayout) {
  if (!groupLayout) {
    return null
  }

  return {
    id: `group:${group.id}`,
    type: 'groupNode',
    className: 'diagram-flow-group',
    dragHandle: '.group-node__label',
    zIndex: 0,
    position: {
      x: groupLayout.x,
      y: groupLayout.y,
    },
    data: {
      label: group.label,
      groupId: group.id,
      memberNodeIds: graphNodes.filter((node) => node.groupId === group.id).map((node) => node.id),
    },
    style: {
      width: groupLayout.w,
      height: groupLayout.h,
      pointerEvents: 'none',
    },
  }
}

function resolveGroupLayout(group, graphNodes, layout) {
  let groupLayout = layout?.groups?.[group.id]
  if (groupLayout) {
    return groupLayout
  }

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
    x: minX - 24,
    y: minY - 42,
    w: maxX - minX + 48,
    h: maxY - minY + 66,
  }
}
