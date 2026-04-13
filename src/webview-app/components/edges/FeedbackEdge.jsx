import React from 'react'
import { BaseEdge } from '@xyflow/react'

import { toFeedbackEdgePath } from './feedbackEdgePath.js'

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

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={(sourceX + targetX) / 2}
      labelY={(sourceY + targetY) / 2}
      labelStyle={labelStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  )
}
