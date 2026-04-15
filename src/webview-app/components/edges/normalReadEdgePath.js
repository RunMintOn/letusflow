import { getBezierPath } from '@xyflow/react'

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
  const sourcePosition = resolveHandlePosition(clippedSource, clippedTarget)
  const targetPosition = resolveHandlePosition(clippedTarget, clippedSource)
  const [path, labelX, labelY] = getBezierPath({
    sourceX: clippedSource.x,
    sourceY: clippedSource.y,
    sourcePosition,
    targetX: clippedTarget.x,
    targetY: clippedTarget.y,
    targetPosition,
  })
  const labelOffsetY = Math.abs(clippedSource.y - clippedTarget.y) <= 24 ? -12 : 0

  return {
    path,
    label: {
      x: Math.round(labelX),
      y: Math.round(labelY + labelOffsetY),
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

function resolveHandlePosition(fromPoint, toPoint) {
  const deltaX = toPoint.x - fromPoint.x
  const deltaY = toPoint.y - fromPoint.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? 'right' : 'left'
  }

  return deltaY >= 0 ? 'bottom' : 'top'
}
