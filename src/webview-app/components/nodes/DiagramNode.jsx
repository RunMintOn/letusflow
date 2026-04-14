import React from 'react'
import { Handle, Position } from '@xyflow/react'

export function DiagramNode({ id, data, selected }) {
  const inputRef = React.useRef(null)
  const nodeClassName = [
    'diagram-node',
    data.nodeType === 'decision' ? 'diagram-node--decision' : '',
    data.isEditing ? 'diagram-node--editing' : '',
  ].filter(Boolean).join(' ')

  React.useEffect(() => {
    if (!data.isEditing || !inputRef.current) {
      return
    }

    inputRef.current.focus()
    inputRef.current.select()
  }, [data.isEditing])

  return (
    <div className={nodeClassName}>
      <Handle type="target" position={data.targetPosition ?? Position.Left} />
      {data.isEditing ? (
        <input
          ref={inputRef}
          className="diagram-node__input nodrag"
          value={data.editingLabel ?? ''}
          onChange={(event) => data.onEditChange?.(id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              data.onEditSubmit?.(id)
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              data.onEditCancel?.(id)
            }
          }}
          onBlur={() => data.onEditSubmit?.(id)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          aria-label="编辑节点文字"
        />
      ) : (
        <div className="diagram-node__label">{data.label}</div>
      )}
      {selected && !data.isEditing ? (
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
