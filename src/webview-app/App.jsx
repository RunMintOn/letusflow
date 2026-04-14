import React from 'react'
import { ReactFlowProvider, addEdge, useEdgesState, useNodesState } from '@xyflow/react'

import { FlowCanvas } from './components/FlowCanvas.jsx'
import { TopToolbar } from './components/TopToolbar.jsx'
import { InspectorPanel } from './components/InspectorPanel.jsx'
import { toInspectorLayoutClass } from './components/inspectorLayout.js'
import { FeedbackEdge } from './components/edges/FeedbackEdge.jsx'
import { DiagramNode } from './components/nodes/DiagramNode.jsx'
import { GroupNode } from './components/nodes/GroupNode.jsx'
import { getVsCodeApi, postToHost } from './bridge/vscodeBridge.js'
import { fromConnectParams } from './mapping/fromConnectParams.js'
import { useEditorState } from './state/useEditorState.jsx'
import { resetFlowLayout } from './actions/resetFlowLayout.js'
import { deleteSelectedElement } from './actions/deleteSelectedElement.js'
import { withNodeActions } from './actions/withNodeActions.js'

const nodeTypes = {
  diagramNode: DiagramNode,
  groupNode: GroupNode,
}

const edgeTypes = {
  feedbackEdge: FeedbackEdge,
}

function AppInner() {
  const initialDocument = window.__DIAGRAM_DOCUMENT__ ?? {
    sourcePath: '',
    graph: { direction: 'LR', nodes: [], edges: [] },
    layout: { nodes: {} },
    fitViewOnLoad: false,
    fitViewRequestToken: 0,
  }

  const [edgeRenderMode, setEdgeRenderMode] = React.useState(initialDocument.edgeRenderMode ?? 'straight')
  const [layoutSpacing, setLayoutSpacing] = React.useState(initialDocument.layoutSpacing ?? 100)
  const [backgroundStyle, setBackgroundStyle] = React.useState(initialDocument.backgroundStyle ?? 'paper')
  const spacingMessageTimeoutRef = React.useRef(null)
  const spacingPreviewTimeoutRef = React.useRef(null)
  const [isSpacingPreviewActive, setIsSpacingPreviewActive] = React.useState(false)
  const { documentModel, flowNodes, flowEdges } = useEditorState(
    initialDocument,
    edgeRenderMode,
    layoutSpacing,
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)
  const [selectedElement, setSelectedElement] = React.useState(null)
  const [isInspectorCollapsed, setIsInspectorCollapsed] = React.useState(false)

  React.useEffect(() => {
    const api = getVsCodeApi()
    postToHost({
      type: 'webviewReady',
      acquireType: typeof acquireVsCodeApi,
      postMessageType: api ? typeof api.postMessage : 'missing',
    })
  }, [])

  React.useEffect(() => {
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  React.useEffect(() => {
    setEdges(flowEdges)
  }, [flowEdges, setEdges])

  React.useEffect(() => {
    return () => {
      window.clearTimeout(spacingMessageTimeoutRef.current)
      window.clearTimeout(spacingPreviewTimeoutRef.current)
    }
  }, [])

  const selectedNode = React.useMemo(
    () => selectedElement?.type === 'node'
      ? nodes.find((node) => node.id === selectedElement.id) ?? null
      : null,
    [nodes, selectedElement],
  )

  const selectedEdge = React.useMemo(
    () => selectedElement?.type === 'edge'
      ? edges.find((edge) => edge.id === selectedElement.id) ?? null
      : null,
    [edges, selectedElement],
  )

  const handleNodeClick = React.useCallback((_event, node) => {
    setSelectedElement({ type: 'node', id: node.id })
  }, [])

  const handleEdgeClick = React.useCallback((_event, edge) => {
    setSelectedElement({
      type: 'edge',
      id: edge.id,
      edgeRef: edge.data.edgeRef,
    })
  }, [])

  const handlePaneClick = React.useCallback(() => {
    setSelectedElement(null)
  }, [])

  const handleRenameNode = React.useCallback((nextLabel) => {
    const trimmedLabel = nextLabel.trim()
    if (selectedElement?.type !== 'node' || !trimmedLabel) {
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedElement.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: trimmedLabel,
              },
            }
          : node,
      ),
    )

    postToHost({
      type: 'renameNode',
      nodeId: selectedElement.id,
      label: trimmedLabel,
    })
  }, [selectedElement, setNodes])

  const handleRenameEdgeLabel = React.useCallback((nextLabel) => {
    if (selectedElement?.type !== 'edge') {
      return
    }

    const trimmedLabel = nextLabel.trim()
    const edgeRef = selectedElement.edgeRef
    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.id === selectedElement.id
          ? {
              ...edge,
              label: trimmedLabel || undefined,
              data: {
                ...edge.data,
                edgeRef: {
                  ...edgeRef,
                  label: trimmedLabel || undefined,
                },
              },
            }
          : edge,
      ),
    )
    setSelectedElement((current) =>
      current?.type === 'edge'
        ? {
            ...current,
            edgeRef: {
              ...edgeRef,
              label: trimmedLabel || undefined,
            },
          }
        : current,
    )

    postToHost({
      type: 'renameEdgeLabel',
      edge: edgeRef,
      label: trimmedLabel,
    })
  }, [selectedElement, setEdges])

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea') {
        return
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }

      event.preventDefault()
      deleteSelectedElement({ selectedElement, postToHost })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement])

  const handleCreateNode = React.useCallback(() => {
    postToHost({
      type: 'createNode',
      label: '新节点',
    })
  }, [])

  const handleCreateSuccessorNode = React.useCallback((nodeId) => {
    postToHost({
      type: 'createSuccessorNode',
      nodeId,
      label: '新节点',
    })
  }, [])

  const handleAutoLayout = React.useCallback(() => {
    resetFlowLayout({
      setNodes,
      setEdges,
      flowNodes,
      flowEdges,
      postToHost,
    })
  }, [flowEdges, flowNodes, setEdges, setNodes])

  const handleLayoutSpacingChange = React.useCallback((nextSpacing) => {
    const value = Number(nextSpacing)
    setLayoutSpacing(value)
    setIsSpacingPreviewActive(true)
    window.clearTimeout(spacingPreviewTimeoutRef.current)
    spacingPreviewTimeoutRef.current = window.setTimeout(() => {
      setIsSpacingPreviewActive(false)
    }, 140)
    window.clearTimeout(spacingMessageTimeoutRef.current)
    spacingMessageTimeoutRef.current = window.setTimeout(() => {
      postToHost({
        type: 'setSpacing',
        value,
      })
    }, 200)
  }, [])

  const handleEdgeRenderModeChange = React.useCallback((nextEdgeRenderMode) => {
    setEdgeRenderMode(nextEdgeRenderMode)
    postToHost({
      type: 'setEdgeRenderMode',
      value: nextEdgeRenderMode,
    })
  }, [])

  const handleBackgroundStyleChange = React.useCallback((nextBackgroundStyle) => {
    setBackgroundStyle(nextBackgroundStyle)
    postToHost({
      type: 'setBackgroundStyle',
      value: nextBackgroundStyle,
    })
  }, [])

  const handleViewportChange = React.useCallback((nextViewport) => {
    postToHost({
      type: 'setViewport',
      viewport: nextViewport,
    })
  }, [])

  const handleConnect = React.useCallback((connection) => {
    if (!connection?.source || !connection?.target) {
      return
    }

    setEdges((currentEdges) =>
      addEdge(
        {
          source: connection.source,
          target: connection.target,
          type: edgeRenderMode,
        },
        currentEdges,
      ),
    )

    postToHost({
      type: 'createEdge',
      edge: fromConnectParams(connection),
    })
  }, [edgeRenderMode, setEdges])

  const handleNodeDragStop = React.useCallback((_event, node) => {
    setNodes((currentNodes) =>
      currentNodes.map((currentNode) =>
        currentNode.id === node.id
          ? { ...currentNode, position: node.position }
          : currentNode,
      ),
    )
  }, [setNodes])

  const interactiveNodes = React.useMemo(
    () => withNodeActions(nodes, { onCreateSuccessor: handleCreateSuccessorNode }),
    [handleCreateSuccessorNode, nodes],
  )

  return (
    <main className="app-shell">
      <TopToolbar
        sourcePath={documentModel.sourcePath}
        edgeRenderMode={edgeRenderMode}
        layoutSpacing={layoutSpacing}
        backgroundStyle={backgroundStyle}
        onCreateNode={handleCreateNode}
        onAutoLayout={handleAutoLayout}
        onEdgeRenderModeChange={handleEdgeRenderModeChange}
        onLayoutSpacingChange={handleLayoutSpacingChange}
        onBackgroundStyleChange={handleBackgroundStyleChange}
      />
      <section className={toInspectorLayoutClass(isInspectorCollapsed)}>
        <FlowCanvas
          nodes={interactiveNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          isSpacingPreviewActive={isSpacingPreviewActive}
          initialViewport={initialDocument.viewport}
          fitViewOnLoad={initialDocument.fitViewOnLoad}
          fitViewRequestToken={initialDocument.fitViewRequestToken}
          onViewportChange={handleViewportChange}
        />
        <InspectorPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onRenameNode={handleRenameNode}
          onRenameEdgeLabel={handleRenameEdgeLabel}
          isCollapsed={isInspectorCollapsed}
          onToggleCollapsed={() => setIsInspectorCollapsed((current) => !current)}
        />
      </section>
    </main>
  )
}

export function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  )
}
