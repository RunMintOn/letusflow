import React from 'react'

export function GroupNode({ data }) {
  return (
    <div className="group-node">
      <div className="group-node__label">{data.label}</div>
    </div>
  )
}
