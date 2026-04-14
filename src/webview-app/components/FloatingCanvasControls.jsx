import React from 'react'

export function FloatingCanvasControls({
  edgeRenderMode,
  layoutSpacing,
  backgroundStyle,
  onAutoLayout,
  onEdgeRenderModeChange,
  onLayoutSpacingChange,
  onBackgroundStyleChange,
}) {
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = React.useState(false)

  const backgroundLabel = backgroundStyle === 'obsidian'
    ? '点阵'
    : backgroundStyle === 'gradient'
      ? '渐变'
      : '纸面'
  const edgeModeLabel = edgeRenderMode === 'default' ? '曲线' : '直线'

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
          <span>/</span>
          <span>{edgeModeLabel}</span>
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

          <div className="canvas-display-menu__section">
            <div className="canvas-display-menu__title">连线</div>
            <div className="canvas-display-menu__options">
              <button
                type="button"
                className={edgeRenderMode === 'straight' ? 'canvas-display-menu__option is-active' : 'canvas-display-menu__option'}
                onClick={() => onEdgeRenderModeChange('straight')}
              >
                直线
              </button>
              <button
                type="button"
                className={edgeRenderMode === 'default' ? 'canvas-display-menu__option is-active' : 'canvas-display-menu__option'}
                onClick={() => onEdgeRenderModeChange('default')}
              >
                曲线
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

      <div className="canvas-hud canvas-hud--bottom">
        <label className="canvas-slider">
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
      </div>
    </>
  )
}
