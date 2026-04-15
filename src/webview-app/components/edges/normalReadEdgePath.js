import { getStraightPath } from '@xyflow/react'

const DECISION_DIAMOND_SIDE = 64
const DECISION_DIAMOND_RADIUS = DECISION_DIAMOND_SIDE * Math.SQRT2 / 2

export function toNormalReadEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
}) {
  const clippedSource = isDecisionNode(sourceNode)
    ? toDecisionBoundaryPoint(sourceNode, { x: targetX, y: targetY })
    : { x: sourceX, y: sourceY }
  const clippedTarget = isDecisionNode(targetNode)
    ? toDecisionBoundaryPoint(targetNode, { x: sourceX, y: sourceY })
    : { x: targetX, y: targetY }
  const [path, labelX, labelY] = getStraightPath({
    sourceX: clippedSource.x,
    sourceY: clippedSource.y,
    targetX: clippedTarget.x,
    targetY: clippedTarget.y,
  })

  return {
    path,
    label: {
      x: Math.round(labelX),
      y: Math.round(labelY),
    },
  }
}

function isDecisionNode(node) {
  return node?.nodeType === 'decision'
}

function toDecisionBoundaryPoint(node, oppositePoint) {
  const centerX = node.x + node.w / 2
  const centerY = node.y + node.h / 2
  const deltaX = oppositePoint.x - centerX
  const deltaY = oppositePoint.y - centerY
  const manhattan = Math.abs(deltaX) + Math.abs(deltaY)

  if (!manhattan) {
    return {
      x: Math.round(centerX),
      y: Math.round(centerY),
    }
  }

  const scale = DECISION_DIAMOND_RADIUS / manhattan

  return {
    x: Math.round(centerX + deltaX * scale),
    y: Math.round(centerY + deltaY * scale),
  }
}
