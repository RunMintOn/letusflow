import React from 'react'

export function InspectorPanel({ selectedNode, onRenameNode }) {
  const [draftLabel, setDraftLabel] = React.useState('')

  React.useEffect(() => {
    setDraftLabel(selectedNode?.data?.label ?? '')
  }, [selectedNode])

  return (
    <aside className="inspector-panel">
      <div className="inspector-title">节点信息</div>
      {selectedNode ? (
        <>
          <div className="inspector-meta">ID: {selectedNode.id}</div>
          <label className="inspector-field">
            <span>文字</span>
            <input
              type="text"
              value={draftLabel}
              onChange={(event) => {
                setDraftLabel(event.target.value)
              }}
            />
          </label>
          <button
            type="button"
            className="inspector-save"
            onClick={() => onRenameNode(draftLabel)}
          >
            保存文字
          </button>
        </>
      ) : (
        <div className="inspector-empty">点击节点后可编辑文字</div>
      )}
    </aside>
  )
}
