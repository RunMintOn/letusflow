import React from 'react'
import { Background, Controls, ReactFlow, useNodesInitialized, useReactFlow } from '@xyflow/react'

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
  isSpacingPreviewActive,
  initialViewport,
  fitViewOnLoad,
  fitViewRequestToken,
  onViewportChange,
}) {
  const reactFlow = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const lastAppliedFitViewRequestRef = React.useRef(0)
  const resolvedInitialViewport = initialViewport ?? { x: 0, y: 0, zoom: 1 }

  React.useEffect(() => {
    if (!fitViewOnLoad || !fitViewRequestToken) {
      return
    }
    if (!nodesInitialized || !reactFlow.viewportInitialized) {
      return
    }
    if (lastAppliedFitViewRequestRef.current === fitViewRequestToken) {
      return
    }

    lastAppliedFitViewRequestRef.current = fitViewRequestToken
    void reactFlow.fitView({ padding: 0.18, duration: 180 }).then(() => {
      onViewportChange?.(reactFlow.getViewport())
    })
  }, [fitViewOnLoad, fitViewRequestToken, nodesInitialized, onViewportChange, reactFlow])

  return (
    <div className={isSpacingPreviewActive ? 'flow-canvas flow-canvas--spacing-preview' : 'flow-canvas'}>
      <ReactFlow
        defaultViewport={resolvedInitialViewport}
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
        onMoveEnd={(_event, nextViewport) => onViewportChange?.(nextViewport)}
        proOptions={{ hideAttribution: true }}
      >
        <Background className="flow-background" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
