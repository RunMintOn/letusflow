import { Position, getBezierPath, getStraightPath } from '@xyflow/react'

export function toNormalReadEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  targetSide = 'left',
  targetOffset = 0,
  renderMode = 'straight',
}) {
  const adjustedTarget = toAdjustedTarget(targetX, targetY, targetSide, targetOffset)
  if (renderMode === 'default') {
    return toBezierGeometry({
      sourceX,
      sourceY,
      targetX: adjustedTarget.x,
      targetY: adjustedTarget.y,
      sourcePosition: toSourcePosition(targetSide),
      targetPosition: toPosition(targetSide),
    })
  }

  return toStraightGeometry({
    sourceX,
    sourceY,
    targetX: adjustedTarget.x,
    targetY: adjustedTarget.y,
  })
}

function toAdjustedTarget(targetX, targetY, targetSide, targetOffset) {
  if (targetSide === 'top' || targetSide === 'bottom') {
    return {
      x: targetX + targetOffset,
      y: targetY,
    }
  }

  return {
    x: targetX,
    y: targetY + targetOffset,
  }
}

function toBezierGeometry({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return {
    path,
    label: {
      x: Math.round(labelX),
      y: Math.round(labelY),
    },
  }
}

function toStraightGeometry({
  sourceX,
  sourceY,
  targetX,
  targetY,
}) {
  const [path, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return {
    path,
    label: {
      x: Math.round(labelX),
      y: Math.round(labelY),
    },
  }
}

function toSourcePosition(targetSide) {
  if (targetSide === 'top') {
    return Position.Bottom
  }
  if (targetSide === 'bottom') {
    return Position.Top
  }
  if (targetSide === 'right') {
    return Position.Left
  }

  return Position.Right
}

function toPosition(side) {
  if (side === 'top') {
    return Position.Top
  }
  if (side === 'bottom') {
    return Position.Bottom
  }
  if (side === 'right') {
    return Position.Right
  }

  return Position.Left
}
