import React from 'react'

export function TopToolbar({ sourcePath, onCreateNode, onAutoLayout }) {
  return (
    <header className="app-toolbar">
      <div>
        <div className="toolbar-title">Diagram Editor</div>
        <div className="toolbar-path">{sourcePath}</div>
        <div className="toolbar-hint">拖拽只临时调整视图；点击“整理布局”会恢复算法排版。</div>
      </div>
      <div className="toolbar-actions">
        <button type="button" onClick={onCreateNode}>
          新增节点
        </button>
        <button type="button" onClick={onAutoLayout} disabled={!onAutoLayout}>
          整理布局
        </button>
      </div>
    </header>
  )
}
