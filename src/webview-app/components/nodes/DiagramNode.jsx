import React from 'react'
import { Handle, Position } from '@xyflow/react'

export function DiagramNode({ data }) {
  return (
    <div className="diagram-node">
      <Handle type="target" position={data.targetPosition ?? Position.Left} />
      <div className="diagram-node__label">{data.label}</div>
      <Handle type="source" position={data.sourcePosition ?? Position.Right} />
    </div>
  )
}
