import React from 'react'
import { Background, Controls, ReactFlow } from '@xyflow/react'

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStop,
  nodeTypes,
  edgeTypes,
}) {
  return (
    <div className="flow-canvas">
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        proOptions={{ hideAttribution: true }}
      >
        <Background className="flow-background" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
