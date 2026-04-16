import React from 'react'

export function FloatingGroupEditor({ selectedGroup, onRenameGroupLabel }) {
  const [draftLabel, setDraftLabel] = React.useState('')

  React.useEffect(() => {
    setDraftLabel(selectedGroup?.label ?? '')
  }, [selectedGroup])

  if (!selectedGroup) {
    return null
  }

  return (
    <div className="floating-edge-editor">
      <div className="floating-edge-editor__title">分组标题</div>
      <div className="floating-edge-editor__meta">
        {selectedGroup.groupId}
      </div>
      <input
        type="text"
        value={draftLabel}
        onChange={(event) => setDraftLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onRenameGroupLabel(draftLabel)
          }
        }}
        aria-label="分组标题"
      />
      <button type="button" onClick={() => onRenameGroupLabel(draftLabel)}>
        保存
      </button>
    </div>
  )
}
