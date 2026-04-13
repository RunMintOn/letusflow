import React from 'react'
import { BaseEdge } from '@xyflow/react'

import {
  toFeedbackEdgeLabelPosition,
  toFeedbackEdgePath,
} from './feedbackEdgePath.js'

export function FeedbackEdge({
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
  const path = toFeedbackEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    route: data.feedbackRoute,
  })
  const labelPosition = toFeedbackEdgeLabelPosition({
    sourceX,
    sourceY,
    targetX,
    targetY,
    route: data.feedbackRoute,
  })

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={labelPosition.x}
      labelY={labelPosition.y}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  )
}
