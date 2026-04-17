import React from 'react'

export function FloatingEdgeEditor({ selectedEdge, onRenameEdgeLabel, onDeleteEdge }) {
  const [draftLabel, setDraftLabel] = React.useState('')

  React.useEffect(() => {
    setDraftLabel(selectedEdge?.label ?? '')
  }, [selectedEdge])

  if (!selectedEdge) {
    return null
  }

  return (
    <div className="floating-edge-editor">
      <div className="floating-edge-editor__title">连线文字</div>
      <div className="floating-edge-editor__meta">
        {selectedEdge.source} → {selectedEdge.target}
      </div>
      <input
        type="text"
        value={draftLabel}
        onChange={(event) => setDraftLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onRenameEdgeLabel(draftLabel)
          }
        }}
        aria-label="连线文字"
      />
      <button type="button" onClick={() => onRenameEdgeLabel(draftLabel)}>
        保存
      </button>
      <button type="button" onClick={onDeleteEdge}>
        删除连线
      </button>
    </div>
  )
}
