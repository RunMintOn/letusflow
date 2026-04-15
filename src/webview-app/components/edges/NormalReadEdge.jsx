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
  label,
  labelStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
}) {
  const geometry = toNormalReadEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceNode: data?.sourceNode,
    targetNode: data?.targetNode,
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
