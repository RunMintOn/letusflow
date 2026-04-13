import React from 'react'

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  onRenameNode,
  onRenameEdgeLabel,
  isCollapsed,
  onToggleCollapsed,
}) {
  const [draftLabel, setDraftLabel] = React.useState('')

  React.useEffect(() => {
    setDraftLabel(selectedNode?.data?.label ?? selectedEdge?.label ?? '')
  }, [selectedEdge, selectedNode])

  if (isCollapsed) {
    return (
      <aside className="inspector-panel inspector-panel--collapsed">
        <button
          type="button"
          className="inspector-toggle inspector-toggle--collapsed"
          onClick={onToggleCollapsed}
          aria-label="展开属性面板"
        >
          属性
        </button>
      </aside>
    )
  }

  return (
    <aside className="inspector-panel">
      <div className="inspector-header">
        <div className="inspector-title">{selectedEdge ? '连线信息' : '节点信息'} v1.02</div>
        <button
          type="button"
          className="inspector-toggle"
          onClick={onToggleCollapsed}
          aria-label="收起属性面板"
        >
          收起
        </button>
      </div>
      {selectedEdge ? (
        <>
          <div className="inspector-meta">
            {selectedEdge.source} → {selectedEdge.target}
          </div>
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
            onClick={() => onRenameEdgeLabel(draftLabel)}
          >
            保存文字
          </button>
        </>
      ) : selectedNode ? (
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
