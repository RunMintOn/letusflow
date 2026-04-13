import React from 'react'
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react'

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStop,
  nodeTypes,
}) {
  return (
    <div className="flow-canvas">
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
      >
        <MiniMap />
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
