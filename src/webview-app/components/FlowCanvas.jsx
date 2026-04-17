import React from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react'

import { ObsidianDotGridBackground } from './ObsidianDotGridBackground.jsx'

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onReconnectStart,
  onReconnectEnd,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onPaneClick,
  onNodeDragStop,
  onMoveStart,
  onMoveEnd,
  nodesDraggable = true,
  nodeTypes,
  edgeTypes,
  isSpacingPreviewActive,
  backgroundStyle = 'paper',
  initialViewport,
  fitViewOnLoad,
  fitViewRequestToken,
  onViewportChange,
}) {
  const reactFlow = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const lastAppliedFitViewRequestRef = React.useRef(0)
  const resolvedInitialViewport = initialViewport ?? { x: 0, y: 0, zoom: 1 }
  const canvasStyleClassName = backgroundStyle === 'obsidian'
    ? 'flow-canvas--obsidian'
    : backgroundStyle === 'gradient'
      ? 'flow-canvas--gradient'
      : 'flow-canvas--paper'
  const canvasClassName = isSpacingPreviewActive
    ? `flow-canvas ${canvasStyleClassName} flow-canvas--spacing-preview`
    : `flow-canvas ${canvasStyleClassName}`
  const shouldRenderObsidianBackground = backgroundStyle === 'obsidian'

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
    <div className={canvasClassName}>
      <ReactFlow
        defaultViewport={resolvedInitialViewport}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={(event) => event.preventDefault()}
        onNodeDragStop={onNodeDragStop}
        onMoveStart={onMoveStart}
        nodesDraggable={nodesDraggable}
        edgesReconnectable={true}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        panOnDrag={[2]}
        selectNodesOnDrag={false}
        onMoveEnd={(event, nextViewport) => {
          onMoveEnd?.(event, nextViewport)
          onViewportChange?.(nextViewport)
        }}
        proOptions={{ hideAttribution: true }}
      >
        {shouldRenderObsidianBackground ? (
          <ObsidianDotGridBackground />
        ) : (
          <Background
            className="flow-background"
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.35}
          />
        )}
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
