import React from 'react'
import { NodeResizeControl, ResizeControlVariant } from '@xyflow/react'

const resizeLinePositions = ['top', 'right', 'bottom', 'left']

export function GroupNode({ data, selected, dragging }) {
  const className = selected
    ? dragging
      ? 'group-node is-selected is-dragging'
      : 'group-node is-selected'
    : dragging
      ? 'group-node is-dragging'
      : 'group-node'

  return (
    <div className={className}>
      {selected
        ? resizeLinePositions.map((position) => (
            <NodeResizeControl
              key={position}
              className={`group-node__resize-line group-node__resize-line--${position}`}
              position={position}
              variant={ResizeControlVariant.Line}
              minWidth={220}
              minHeight={120}
              onResizeEnd={(_event, params) => data.onResizeGroup?.(data.groupId, params)}
            />
          ))
        : null}
      <div className="group-node__label" title={data.groupId}>
        {data.label}
      </div>
    </div>
  )
}
