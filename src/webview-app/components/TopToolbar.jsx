import React from 'react'

export function TopToolbar({ sourcePath, onCreateNode, onAutoLayout }) {
  return (
    <header className="app-toolbar">
      <div>
        <div className="toolbar-title">Diagram Editor</div>
        <div className="toolbar-path">{sourcePath}</div>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={onCreateNode}>
          新增节点
        </button>
        <button type="button" onClick={onAutoLayout} disabled={!onAutoLayout}>
          自动布局
        </button>
      </div>
    </header>
  )
}
