import React from 'react'
import { ReactFlowProvider, addEdge, useEdgesState, useNodesState } from '@xyflow/react'

import { FlowCanvas } from './components/FlowCanvas.jsx'
import { FloatingCanvasControls } from './components/FloatingCanvasControls.jsx'
import { FloatingEdgeEditor } from './components/FloatingEdgeEditor.jsx'
import { FeedbackEdge } from './components/edges/FeedbackEdge.jsx'
import { NormalReadEdge } from './components/edges/NormalReadEdge.jsx'
import { DiagramNode } from './components/nodes/DiagramNode.jsx'
import { GroupNode } from './components/nodes/GroupNode.jsx'
import { getVsCodeApi, postToHost } from './bridge/vscodeBridge.js'
import { fromConnectParams } from './mapping/fromConnectParams.js'
import { useEditorState } from './state/useEditorState.jsx'
import { reconcileSelectedElement } from './state/reconcileSelectedElement.js'
import { resetFlowLayout } from './actions/resetFlowLayout.js'
import { deleteSelectedElement } from './actions/deleteSelectedElement.js'
import { withNodeActions } from './actions/withNodeActions.js'

const nodeTypes = {
  diagramNode: DiagramNode,
  groupNode: GroupNode,
}

const edgeTypes = {
  readEdge: NormalReadEdge,
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
  const { documentModel, setDocumentModel, flowNodes, flowEdges } = useEditorState(
    initialDocument,
    edgeRenderMode,
    layoutSpacing,
    isSpacingPreviewActive,
  )
  const documentError = documentModel.documentError ?? null
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)
  const [selectedElement, setSelectedElement] = React.useState(null)
  const [editingNodeId, setEditingNodeId] = React.useState(null)
  const [editingNodeLabel, setEditingNodeLabel] = React.useState('')
  const editingNodeIdRef = React.useRef(null)
  const editingNodeLabelRef = React.useRef('')

  React.useEffect(() => {
    const api = getVsCodeApi()
    postToHost({
      type: 'webviewReady',
      acquireType: typeof acquireVsCodeApi,
      postMessageType: api ? typeof api.postMessage : 'missing',
    })
  }, [])

  React.useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data
      if (message?.type !== 'syncState' || !message.payload) {
        return
      }

      setDocumentModel(message.payload)
      setEdgeRenderMode(message.payload.edgeRenderMode ?? 'straight')
      setLayoutSpacing(message.payload.layoutSpacing ?? 100)
      setBackgroundStyle(message.payload.backgroundStyle ?? 'paper')
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setDocumentModel])

  React.useEffect(() => {
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  React.useEffect(() => {
    setEdges(flowEdges)
  }, [flowEdges, setEdges])

  React.useEffect(() => {
    setSelectedElement((current) => reconcileSelectedElement(current, flowNodes, flowEdges))
  }, [flowEdges, flowNodes])

  React.useEffect(() => {
    editingNodeIdRef.current = editingNodeId
  }, [editingNodeId])

  React.useEffect(() => {
    editingNodeLabelRef.current = editingNodeLabel
  }, [editingNodeLabel])

  React.useEffect(() => {
    return () => {
      window.clearTimeout(spacingMessageTimeoutRef.current)
      window.clearTimeout(spacingPreviewTimeoutRef.current)
    }
  }, [])

  const selectedEdge = React.useMemo(
    () => selectedElement?.type === 'edge'
      ? edges.find((edge) => edge.id === selectedElement.id) ?? null
      : null,
    [edges, selectedElement],
  )

  const handleNodeClick = React.useCallback((_event, node) => {
    setSelectedElement({ type: 'node', id: node.id })
  }, [])

  const handleNodeDoubleClick = React.useCallback((_event, node) => {
    setSelectedElement({ type: 'node', id: node.id })
    editingNodeIdRef.current = node.id
    editingNodeLabelRef.current = node.data.label ?? ''
    setEditingNodeId(node.id)
    setEditingNodeLabel(node.data.label ?? '')
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

  const handleRenameNode = React.useCallback((nodeId, nextLabel) => {
    const trimmedLabel = nextLabel.trim()
    if (!nodeId || !trimmedLabel) {
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
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
      nodeId,
      label: trimmedLabel,
    })
  }, [setNodes])

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

  const cancelNodeEditing = React.useCallback((nodeId) => {
    if (editingNodeIdRef.current !== nodeId) {
      return
    }

    editingNodeIdRef.current = null
    editingNodeLabelRef.current = ''
    setEditingNodeId(null)
    setEditingNodeLabel('')
  }, [])

  const submitNodeEditing = React.useCallback((nodeId) => {
    if (editingNodeIdRef.current !== nodeId) {
      return
    }

    const nextLabel = editingNodeLabelRef.current
    const trimmedLabel = nextLabel.trim()
    const currentNode = nodes.find((node) => node.id === nodeId)

    editingNodeIdRef.current = null
    editingNodeLabelRef.current = ''
    setEditingNodeId(null)
    setEditingNodeLabel('')

    if (!trimmedLabel || !currentNode || currentNode.data.label === trimmedLabel) {
      return
    }

    handleRenameNode(nodeId, trimmedLabel)
  }, [handleRenameNode, nodes])

  const handleNodeEditChange = React.useCallback((nodeId, nextLabel) => {
    if (editingNodeIdRef.current !== nodeId) {
      return
    }

    editingNodeLabelRef.current = nextLabel
    setEditingNodeLabel(nextLabel)
  }, [])

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
    () => withNodeActions(nodes, {
      onCreateSuccessor: handleCreateSuccessorNode,
      editingNodeId,
      editingLabel: editingNodeLabel,
      onEditChange: handleNodeEditChange,
      onEditSubmit: submitNodeEditing,
      onEditCancel: cancelNodeEditing,
    }),
    [
      cancelNodeEditing,
      editingNodeId,
      editingNodeLabel,
      handleCreateSuccessorNode,
      handleNodeEditChange,
      nodes,
      submitNodeEditing,
    ],
  )

  return (
    <main className="app-shell">
      {documentError ? (
        <div className="app-document-error" role="alert">
          <strong>DSL 解析失败</strong>
          <span>{documentError}</span>
          <span>当前仍显示上一次有效图。</span>
        </div>
      ) : null}

      <section className="app-canvas-stage">
        <FlowCanvas
          nodes={interactiveNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          isSpacingPreviewActive={isSpacingPreviewActive}
          backgroundStyle={backgroundStyle}
          initialViewport={documentModel.viewport}
          fitViewOnLoad={documentModel.fitViewOnLoad}
          fitViewRequestToken={documentModel.fitViewRequestToken}
          onViewportChange={handleViewportChange}
        />

        <FloatingCanvasControls
          edgeRenderMode={edgeRenderMode}
          layoutSpacing={layoutSpacing}
          backgroundStyle={backgroundStyle}
          onAutoLayout={handleAutoLayout}
          onEdgeRenderModeChange={handleEdgeRenderModeChange}
          onLayoutSpacingChange={handleLayoutSpacingChange}
          onBackgroundStyleChange={handleBackgroundStyleChange}
        />

        <button
          type="button"
          className="canvas-create-node"
          onClick={handleCreateNode}
        >
          新增节点
        </button>

        <FloatingEdgeEditor
          selectedEdge={selectedEdge}
          onRenameEdgeLabel={handleRenameEdgeLabel}
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
