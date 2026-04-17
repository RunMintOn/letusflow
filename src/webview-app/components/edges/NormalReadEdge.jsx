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
  selected,
}) {
  const geometry = toNormalReadEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceNode: data?.sourceNode,
    targetNode: data?.targetNode,
    parallelIndex: data?.parallelIndex,
    parallelCount: data?.parallelCount,
  })
  const resolvedStyle = selected
    ? {
        ...(style ?? {}),
        stroke: '#2f6fed',
        strokeWidth: selected ? 3 : style?.strokeWidth,
      }
    : style
  const resolvedMarkerEnd = selected
    ? {
        ...(markerEnd ?? {}),
        color: '#2f6fed',
      }
    : markerEnd

  return (
    <BaseEdge
      id={id}
      path={geometry.path}
      markerEnd={resolvedMarkerEnd}
      style={resolvedStyle}
      label={label}
      labelX={geometry.label.x}
      labelY={geometry.label.y}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      interactionWidth={28}
    />
  )
}
