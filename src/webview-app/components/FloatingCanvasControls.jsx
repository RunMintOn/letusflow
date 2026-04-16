import React from 'react'

export function FloatingCanvasControls({
  layoutSpacing,
  backgroundStyle,
  isNodeDraggingEnabled,
  onAutoLayout,
  onCreateNode,
  onCreateGroup,
  onLayoutSpacingChange,
  onNodeDraggingToggle,
  onBackgroundStyleChange,
}) {
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = React.useState(false)

  const backgroundLabel = backgroundStyle === 'obsidian'
    ? '点阵'
    : backgroundStyle === 'gradient'
      ? '渐变'
      : '纸面'

  return (
    <>
      <div className="canvas-hud canvas-hud--top-left">
        <button
          type="button"
          className="canvas-hud__icon"
          aria-label="打开显示菜单"
          onClick={() => setIsDisplayMenuOpen((current) => !current)}
        >
          ≡
        </button>
        <button
          type="button"
          className="canvas-hud__chip"
          onClick={() => setIsDisplayMenuOpen((current) => !current)}
        >
          <span className="canvas-hud__chip-label">Display</span>
          <span>{backgroundLabel}</span>
        </button>
      </div>

      {isDisplayMenuOpen ? (
        <div className="canvas-display-menu">
          <div className="canvas-display-menu__section">
            <div className="canvas-display-menu__title">背景</div>
            <div className="canvas-display-menu__options">
              <button
                type="button"
                className={backgroundStyle === 'paper' ? 'canvas-display-menu__option is-active' : 'canvas-display-menu__option'}
                onClick={() => onBackgroundStyleChange('paper')}
              >
                纸面
              </button>
              <button
                type="button"
                className={backgroundStyle === 'obsidian' ? 'canvas-display-menu__option is-active' : 'canvas-display-menu__option'}
                onClick={() => onBackgroundStyleChange('obsidian')}
              >
                点阵
              </button>
              <button
                type="button"
                className={backgroundStyle === 'gradient' ? 'canvas-display-menu__option is-active' : 'canvas-display-menu__option'}
                onClick={() => onBackgroundStyleChange('gradient')}
              >
                渐变
              </button>
            </div>
          </div>

        </div>
      ) : null}

      <div className="canvas-hud canvas-hud--top-right">
        <button
          type="button"
          className="canvas-hud__button"
          onClick={onAutoLayout}
          disabled={!onAutoLayout}
        >
          整理布局
        </button>
      </div>

      <div className="canvas-hud canvas-hud--right">
        <label className="canvas-slider canvas-slider--vertical">
          <span className="canvas-slider__header">
            <span>间距</span>
            <span>{layoutSpacing}%</span>
          </span>
          <span className="canvas-slider__input-wrap">
            <input
              type="range"
              min="30"
              max="150"
              step="5"
              value={layoutSpacing}
              onChange={(event) => onLayoutSpacingChange(event.target.value)}
              aria-label="布局间距"
            />
          </span>
        </label>
      </div>

      <div className="canvas-hud canvas-hud--right canvas-hud--actions">
        <button
          type="button"
          className="canvas-hud__button canvas-hud__button--full"
          onClick={onCreateNode}
        >
          新增节点
        </button>

        <button
          type="button"
          className="canvas-hud__button canvas-hud__button--full"
          onClick={onCreateGroup}
        >
          新增分组
        </button>

        <button
          type="button"
          className={isNodeDraggingEnabled ? 'canvas-hud__toggle is-active' : 'canvas-hud__toggle'}
          onClick={() => onNodeDraggingToggle?.()}
          aria-pressed={isNodeDraggingEnabled}
        >
          <span>拖拽</span>
          <span>{isNodeDraggingEnabled ? '开' : '关'}</span>
        </button>
      </div>
    </>
  )
}
