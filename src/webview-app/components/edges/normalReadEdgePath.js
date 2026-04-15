import { getBezierPath } from '@xyflow/react'

const DECISION_DIAMOND_SIDE = 64
const DECISION_DIAMOND_RADIUS = DECISION_DIAMOND_SIDE * Math.SQRT2 / 2
const PARALLEL_EDGE_OFFSET = 18

export function toNormalReadEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  parallelIndex = 0,
  parallelCount = 1,
}) {
  const clippedSource = isDecisionNode(sourceNode)
    ? toDecisionBoundaryPoint(sourceNode, { x: targetX, y: targetY })
    : { x: sourceX, y: sourceY }
  const clippedTarget = isDecisionNode(targetNode)
    ? toDecisionBoundaryPoint(targetNode, { x: sourceX, y: sourceY })
    : { x: targetX, y: targetY }
  const { fromPoint: offsetSource, toPoint: offsetTarget } = applyParallelOffset(
    clippedSource,
    clippedTarget,
    parallelIndex,
    parallelCount,
  )
  const sourcePosition = resolveHandlePosition(offsetSource, offsetTarget)
  const targetPosition = resolveHandlePosition(offsetTarget, offsetSource)
  const [path, labelX, labelY] = getBezierPath({
    sourceX: offsetSource.x,
    sourceY: offsetSource.y,
    sourcePosition,
    targetX: offsetTarget.x,
    targetY: offsetTarget.y,
    targetPosition,
  })
  const labelOffsetY = Math.abs(offsetSource.y - offsetTarget.y) <= 24 ? -12 : 0

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

function applyParallelOffset(fromPoint, toPoint, parallelIndex, parallelCount) {
  if (parallelCount <= 1 || parallelIndex === 0) {
    return { fromPoint, toPoint }
  }

  const dx = toPoint.x - fromPoint.x
  const dy = toPoint.y - fromPoint.y
  const length = Math.hypot(dx, dy) || 1
  const offsetX = (-dy / length) * parallelIndex * PARALLEL_EDGE_OFFSET
  const offsetY = (dx / length) * parallelIndex * PARALLEL_EDGE_OFFSET

  return {
    fromPoint: {
      x: Math.round(fromPoint.x + offsetX),
      y: Math.round(fromPoint.y + offsetY),
    },
    toPoint: {
      x: Math.round(toPoint.x + offsetX),
      y: Math.round(toPoint.y + offsetY),
    },
  }
}
