import React from 'react'

export function TopToolbar({
  sourcePath,
  edgeRenderMode,
  layoutSpacing,
  backgroundStyle,
  onCreateNode,
  onAutoLayout,
  onEdgeRenderModeChange,
  onLayoutSpacingChange,
  onBackgroundStyleChange,
}) {
  return (
    <header className="app-toolbar">
      <div>
        <div className="toolbar-title">Diagram Editor</div>
        <div className="toolbar-path">{sourcePath}</div>
        <div className="toolbar-hint">拖拽只临时调整视图；点击“整理布局”会恢复算法排版。</div>
      </div>
      <div className="toolbar-actions">
        <label className="toolbar-select">
          <span>背景</span>
          <select
            value={backgroundStyle}
            onChange={(event) => onBackgroundStyleChange(event.target.value)}
            aria-label="背景样式"
          >
            <option value="paper">纸面</option>
            <option value="obsidian">点阵</option>
            <option value="gradient">渐变</option>
          </select>
        </label>
        <label className="toolbar-select">
          <span>连线</span>
          <select
            value={edgeRenderMode}
            onChange={(event) => onEdgeRenderModeChange(event.target.value)}
            aria-label="连线样式"
          >
            <option value="straight">直线</option>
            <option value="default">曲线</option>
          </select>
        </label>
        <label className="toolbar-range">
          <span>间距 {layoutSpacing}%</span>
          <input
            type="range"
            min="30"
            max="150"
            step="5"
            value={layoutSpacing}
            onChange={(event) => onLayoutSpacingChange(event.target.value)}
            aria-label="布局间距"
          />
        </label>
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
