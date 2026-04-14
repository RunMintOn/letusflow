import React from 'react'
import { BaseEdge } from '@xyflow/react'

import { toNormalReadEdgePath } from './normalReadEdgePath.js'

export function NormalReadEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
  label,
  labelStyle,
  labelBgPadding,
  labelBgBorderRadius,
}) {
  const geometry = toNormalReadEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    targetSide: data?.readRoute?.targetSide,
    targetOffset: data?.readRoute?.targetOffset,
    renderMode: data?.readRoute?.renderMode,
  })

  return (
    <BaseEdge
      id={id}
      path={geometry.path}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={geometry.label.x}
      labelY={geometry.label.y}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  )
}
