import React from 'react'
import { Handle, Position } from '@xyflow/react'

export function DiagramNode({ id, data, selected }) {
  return (
    <div className="diagram-node">
      <Handle type="target" position={data.targetPosition ?? Position.Left} />
      <div className="diagram-node__label">{data.label}</div>
      {selected ? (
        <button
          type="button"
          className={[
            'diagram-node__successor',
            data.sourcePosition === Position.Bottom ? 'diagram-node__successor--bottom' : '',
          ].filter(Boolean).join(' ')}
          onClick={(event) => {
            event.stopPropagation()
            data.onCreateSuccessor?.(id)
          }}
          aria-label="新增后继节点"
        >
          +
        </button>
      ) : null}
      <Handle type="source" position={data.sourcePosition ?? Position.Right} />
    </div>
  )
}
