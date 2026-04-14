import React from 'react'
import { useViewport } from '@xyflow/react'

import { toObsidianDotGridPattern } from './obsidianDotGridMath.js'

export function ObsidianDotGridBackground() {
  const viewport = useViewport()
  const pattern = React.useMemo(
    () => toObsidianDotGridPattern(viewport),
    [viewport],
  )

  return (
    <svg className="obsidian-dot-grid" aria-hidden="true">
      <defs>
        <pattern
          id="obsidian-dot-grid-pattern"
          x={pattern.offsetX}
          y={pattern.offsetY}
          width={pattern.gap}
          height={pattern.gap}
          patternUnits="userSpaceOnUse"
        >
          <circle
            className="obsidian-dot-grid__dot"
            cx={pattern.radius}
            cy={pattern.radius}
            r={pattern.radius}
          />
        </pattern>
      </defs>
      <rect className="obsidian-dot-grid__base" x="0" y="0" width="100%" height="100%" />
      <rect
        className="obsidian-dot-grid__pattern"
        x="0"
        y="0"
        width="100%"
        height="100%"
      />
    </svg>
  )
}
