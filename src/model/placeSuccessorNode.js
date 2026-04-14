import { toDagreSpacing } from './layout.js'
import { getNodeDimensions } from './nodeDimensions.js'

const COLLISION_MARGIN = 12

export function placeSuccessorNode(graph, layout, parentNodeId, newNode, spacingValue) {
  const parentBox = layout?.nodes?.[parentNodeId]
  if (!parentBox) {
    return null
  }

  const size = getNodeDimensions(newNode)
  const spacing = toDagreSpacing({ spacing: spacingValue })
  const isVertical = graph.direction === 'TD' || graph.direction === 'TB'
  const baseBox = isVertical
    ? {
        x: parentBox.x,
        y: parentBox.y + parentBox.h + spacing.ranksep,
        w: size.w,
        h: size.h,
      }
    : {
        x: parentBox.x + parentBox.w + spacing.ranksep,
        y: parentBox.y,
        w: size.w,
        h: size.h,
      }

  const step = isVertical
    ? spacing.nodesep + size.w
    : spacing.nodesep + size.h

  const occupiedBoxes = Object.entries(layout?.nodes ?? {})
    .filter(([nodeId]) => nodeId !== newNode.id)
    .map(([, box]) => box)

  let candidate = baseBox
  while (occupiedBoxes.some((box) => boxesOverlap(box, candidate))) {
    candidate = isVertical
      ? { ...candidate, x: candidate.x + step }
      : { ...candidate, y: candidate.y + step }
  }

  return candidate
}

function boxesOverlap(left, right) {
  return !(
    left.x + left.w + COLLISION_MARGIN <= right.x ||
    right.x + right.w + COLLISION_MARGIN <= left.x ||
    left.y + left.h + COLLISION_MARGIN <= right.y ||
    right.y + right.h + COLLISION_MARGIN <= left.y
  )
}
