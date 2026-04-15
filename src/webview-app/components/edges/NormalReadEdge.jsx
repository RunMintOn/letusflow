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
  const labelLayout = data?.labelLayout
  const resolvedLabelX = labelLayout ? Math.round(labelLayout.x + labelLayout.w / 2) : geometry.label.x
  const resolvedLabelY = labelLayout ? Math.round(labelLayout.y + labelLayout.h / 2) : geometry.label.y

  return (
    <BaseEdge
      id={id}
      path={geometry.path}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={resolvedLabelX}
      labelY={resolvedLabelY}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  )
}
