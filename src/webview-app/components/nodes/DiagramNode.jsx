import React from 'react'
import { Handle, Position } from '@xyflow/react'

export function DiagramNode({ id, data, selected }) {
  const inputRef = React.useRef(null)
  const nodeType = data.nodeType ?? 'default'
  const nodeClassName = [
    'diagram-node',
    `diagram-node--type-${nodeType}`,
    data.isEditing ? 'diagram-node--editing' : '',
  ].filter(Boolean).join(' ')
  const nodeStyle = data.nodeColor
    ? {
        '--node-accent-fill': data.nodeColor,
        '--node-accent-stroke': data.nodeColor,
        '--node-accent-stroke-strong': data.nodeColor,
      }
    : undefined

  React.useEffect(() => {
    if (!data.isEditing || !inputRef.current) {
      return
    }

    inputRef.current.focus()
    inputRef.current.select()
  }, [data.isEditing])

  return (
    <div className={nodeClassName} style={nodeStyle}>
      <Handle id="top-target" type="target" position={Position.Top} />
      <Handle id="right-target" type="target" position={Position.Right} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} />
      <Handle id="left-target" type="target" position={Position.Left} />
      <Handle id="top-source" type="source" position={Position.Top} />
      <Handle id="right-source" type="source" position={Position.Right} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} />
      <Handle id="left-source" type="source" position={Position.Left} />
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
    </div>
  )
}
