import React from 'react'
import { ReactFlowProvider, addEdge, useEdgesState, useNodesState } from '@xyflow/react'

import { FlowCanvas } from './components/FlowCanvas.jsx'
import { FloatingCanvasControls } from './components/FloatingCanvasControls.jsx'
import { FloatingEdgeEditor } from './components/FloatingEdgeEditor.jsx'
import { FloatingGroupEditor } from './components/FloatingGroupEditor.jsx'
import { NormalReadEdge } from './components/edges/NormalReadEdge.jsx'
import { DiagramNode } from './components/nodes/DiagramNode.jsx'
import { GroupNode } from './components/nodes/GroupNode.jsx'
import { fromNodeDragMessage } from './bridge/fromNodeDragMessage.js'
import { getVsCodeApi, postToHost } from './bridge/vscodeBridge.js'
import { fromConnectParams } from './mapping/fromConnectParams.js'
import { withLiveEdgeNodeGeometry } from './mapping/withLiveEdgeNodeGeometry.js'
import { useEditorState } from './state/useEditorState.jsx'
import { reconcileSelectedElement } from './state/reconcileSelectedElement.js'
import { resetFlowLayout } from './actions/resetFlowLayout.js'
import { deleteSelectedElement } from './actions/deleteSelectedElement.js'
import { applyLiveGroupDrag } from './actions/applyLiveGroupDrag.js'
import { withNodeActions } from './actions/withNodeActions.js'

const nodeTypes = {
  diagramNode: DiagramNode,
  groupNode: GroupNode,
}

const edgeTypes = {
  readEdge: NormalReadEdge,
}

function AppInner() {
  const initialDocument = window.__DIAGRAM_DOCUMENT__ ?? {
    sourcePath: '',
    graph: { direction: 'LR', groups: [], nodes: [], edges: [] },
    layout: { version: 1, nodes: {}, groups: {}, edges: {} },
    fitViewOnLoad: false,
    fitViewRequestToken: 0,
  }

  const [layoutSpacing, setLayoutSpacing] = React.useState(initialDocument.layoutSpacing ?? 100)
  const [backgroundStyle, setBackgroundStyle] = React.useState(initialDocument.backgroundStyle ?? 'paper')
  const spacingMessageTimeoutRef = React.useRef(null)
  const spacingPreviewTimeoutRef = React.useRef(null)
  const [isSpacingPreviewActive, setIsSpacingPreviewActive] = React.useState(false)
  const { documentModel, setDocumentModel, flowNodes, flowEdges } = useEditorState(
    initialDocument,
    layoutSpacing,
    isSpacingPreviewActive,
  )
  const documentError = documentModel.documentError ?? null
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)
  const [selectedElement, setSelectedElement] = React.useState(null)
  const [editingNodeId, setEditingNodeId] = React.useState(null)
  const [editingNodeLabel, setEditingNodeLabel] = React.useState('')
  const [isNodeDraggingEnabled, setIsNodeDraggingEnabled] = React.useState(true)
  const reconnectSuccessfulRef = React.useRef(false)
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

  const renderedEdges = React.useMemo(
    () => withLiveEdgeNodeGeometry(edges, nodes),
    [edges, nodes],
  )

  const selectedEdge = React.useMemo(
    () => selectedElement?.type === 'edge'
      ? renderedEdges.find((edge) => (edge.data?.edgeId ?? edge.id) === selectedElement?.edgeId) ?? null
      : null,
    [renderedEdges, selectedElement],
  )

  const selectedGroup = React.useMemo(
    () => selectedElement?.type === 'group'
      ? documentModel.graph.groups.find((group) => group.id === selectedElement.groupId) ?? null
      : null,
    [documentModel.graph.groups, selectedElement],
  )

  const handleNodeClick = React.useCallback((_event, node) => {
    if (node.type === 'groupNode') {
      setSelectedElement({ type: 'group', id: node.id, groupId: node.data.groupId })
      return
    }

    setSelectedElement({ type: 'node', id: node.id })
  }, [])

  const handleNodeDoubleClick = React.useCallback((_event, node) => {
    if (node.type === 'groupNode') {
      setSelectedElement({ type: 'group', id: node.id, groupId: node.data.groupId })
      return
    }

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
      edgeId: edge.data?.edgeId ?? edge.id,
      edgeRef: edge.data.edgeRef,
    })
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
        (edge.data?.edgeId ?? edge.id) === selectedElement.edgeId
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
      edgeId: selectedElement.edgeId,
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

  const handlePaneClick = React.useCallback((event) => {
    if (event.detail >= 2) {
      handleCreateNode()
      return
    }

    setSelectedElement(null)
  }, [handleCreateNode])

  const handleCreateGroup = React.useCallback(() => {
    const groupId = generateGroupId(documentModel.graph.groups ?? [])
    postToHost({
      type: 'createGroup',
      group: {
        id: groupId,
        label: '新分组',
      },
      layout: {
        x: 40 + (documentModel.graph.groups?.length ?? 0) * 24,
        y: 40 + (documentModel.graph.groups?.length ?? 0) * 24,
        w: 320,
        h: 180,
      },
    })
  }, [documentModel.graph.groups])

  const handleCreateSuccessorNode = React.useCallback((nodeId) => {
    postToHost({
      type: 'createSuccessorNode',
      nodeId,
      label: '新节点',
    })
  }, [])

  const handleAutoLayout = React.useCallback(() => {
    if (!window.confirm('整理布局会覆盖当前自动分配结果。继续吗？')) {
      return
    }

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

  const handleNodeDraggingToggle = React.useCallback(() => {
    setIsNodeDraggingEnabled((current) => !current)
  }, [])

  const handleConnect = React.useCallback((connection) => {
    if (!connection?.source || !connection?.target) {
      return
    }

    setEdges((currentEdges) =>
      addEdge(
        {
          source: connection.source,
          sourceHandle: connection.sourceHandle,
          target: connection.target,
          targetHandle: connection.targetHandle,
          type: 'readEdge',
        },
        currentEdges,
      ),
    )

    postToHost({
      type: 'createEdge',
      edge: fromConnectParams(connection),
    })
  }, [setEdges])

  const handleReconnect = React.useCallback((oldEdge, connection) => {
    if (!oldEdge?.id || !connection?.source || !connection?.target) {
      return
    }

    reconnectSuccessfulRef.current = true
    const nextEdge = fromConnectParams(connection)
    const edgeId = oldEdge.data?.edgeId ?? oldEdge.id

    setEdges((currentEdges) =>
      currentEdges.map((edge) =>
        edge.id === oldEdge.id
          ? {
              ...edge,
              source: connection.source,
              target: connection.target,
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
              data: {
                ...(edge.data ?? {}),
                edgeRef: {
                  ...(edge.data?.edgeRef ?? {}),
                  from: nextEdge.from,
                  to: nextEdge.to,
                },
              },
            }
          : edge,
      ),
    )

    setSelectedElement((current) =>
      current?.type === 'edge' && current.edgeId === edgeId
        ? {
            ...current,
            edgeRef: {
              ...(current.edgeRef ?? {}),
              from: nextEdge.from,
              to: nextEdge.to,
            },
          }
        : current,
    )

    postToHost({
      type: 'reconnectEdge',
      edgeId,
      edge: nextEdge,
    })
  }, [setEdges])

  const handleReconnectStart = React.useCallback(() => {
    reconnectSuccessfulRef.current = false
  }, [])

  const handleReconnectEnd = React.useCallback((_event, edge) => {
    if (reconnectSuccessfulRef.current) {
      return
    }

    const edgeId = edge?.data?.edgeId ?? edge?.id
    if (!edgeId) {
      return
    }

    setEdges((currentEdges) =>
      currentEdges.filter((currentEdge) => (currentEdge.data?.edgeId ?? currentEdge.id) !== edgeId),
    )
    setSelectedElement((current) =>
      current?.type === 'edge' && current.edgeId === edgeId
        ? null
        : current,
    )
    postToHost({
      type: 'deleteEdge',
      edgeId,
      edge: edge.data?.edgeRef,
    })
  }, [setEdges])

  const handleDeleteSelectedEdge = React.useCallback(() => {
    if (selectedElement?.type !== 'edge') {
      return
    }

    setEdges((currentEdges) =>
      currentEdges.filter((edge) => (edge.data?.edgeId ?? edge.id) !== selectedElement.edgeId),
    )
    setSelectedElement(null)
    postToHost({
      type: 'deleteEdge',
      edgeId: selectedElement.edgeId,
      edge: selectedElement.edgeRef,
    })
  }, [selectedElement, setEdges])

  const handleNodeDrag = React.useCallback((_event, node) => {
    if (node.type !== 'groupNode') {
      return
    }

    setNodes((currentNodes) => applyLiveGroupDrag(currentNodes, node))
  }, [setNodes])

  const handleNodeDragStop = React.useCallback((_event, node) => {
    if (node.type === 'groupNode') {
      const groupId = node.data.groupId
      const previousLayout = documentModel.layout.groups?.[groupId]
      if (!previousLayout) {
        return
      }

      const delta = {
        x: node.position.x - previousLayout.x,
        y: node.position.y - previousLayout.y,
      }

      setNodes((currentNodes) => applyLiveGroupDrag(currentNodes, node))

      postToHost({
        type: 'dragGroup',
        groupId,
        delta,
      })
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((currentNode) =>
        currentNode.id === node.id
          ? { ...currentNode, position: node.position }
          : currentNode,
      ),
    )
    postToHost(fromNodeDragMessage(node))

    const currentGroupId = documentModel.graph.nodes.find((graphNode) => graphNode.id === node.id)?.groupId ?? null
    const nextGroupId = findStrictDropGroupId(node, nodes)

    if (nextGroupId !== currentGroupId) {
      postToHost({
        type: 'moveNodeToGroup',
        nodeId: node.id,
        groupId: nextGroupId,
      })
    }
  }, [documentModel.graph.nodes, documentModel.layout.groups, nodes, setNodes])

  const handleRenameGroupLabel = React.useCallback((nextLabel) => {
    if (selectedElement?.type !== 'group') {
      return
    }

    const trimmedLabel = nextLabel.trim()
    if (!trimmedLabel) {
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === `group:${selectedElement.groupId}`
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
      type: 'renameGroup',
      groupId: selectedElement.groupId,
      label: trimmedLabel,
    })
  }, [selectedElement, setNodes])

  const interactiveNodes = React.useMemo(
    () => withNodeActions(nodes, {
      onCreateSuccessor: handleCreateSuccessorNode,
      isNodeDraggingEnabled,
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
      isNodeDraggingEnabled,
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
          edges={renderedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onReconnect={handleReconnect}
          onReconnectStart={handleReconnectStart}
          onReconnectEnd={handleReconnectEnd}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeDrag={handleNodeDrag}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeDragStop={handleNodeDragStop}
          nodesDraggable={isNodeDraggingEnabled}
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
          layoutSpacing={layoutSpacing}
          backgroundStyle={backgroundStyle}
          isNodeDraggingEnabled={isNodeDraggingEnabled}
          onAutoLayout={handleAutoLayout}
          onCreateNode={handleCreateNode}
          onCreateGroup={handleCreateGroup}
          onLayoutSpacingChange={handleLayoutSpacingChange}
          onNodeDraggingToggle={handleNodeDraggingToggle}
          onBackgroundStyleChange={handleBackgroundStyleChange}
        />

        <FloatingEdgeEditor
          selectedEdge={selectedEdge}
          onRenameEdgeLabel={handleRenameEdgeLabel}
          onDeleteEdge={handleDeleteSelectedEdge}
        />

        <FloatingGroupEditor
          selectedGroup={selectedGroup}
          onRenameGroupLabel={handleRenameGroupLabel}
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

function generateGroupId(groups) {
  const existingIds = new Set((groups ?? []).map((group) => group.id))
  if (!existingIds.has('group')) {
    return 'group'
  }

  let index = 2
  while (existingIds.has(`group-${index}`)) {
    index += 1
  }

  return `group-${index}`
}

function findStrictDropGroupId(node, allNodes) {
  const groupNodes = allNodes.filter((candidate) => candidate.type === 'groupNode')
  const nodeBox = {
    x: node.position.x,
    y: node.position.y,
    w: node.width ?? node.measured?.width ?? node.style?.width ?? 140,
    h: node.height ?? node.measured?.height ?? node.style?.height ?? 56,
  }

  for (const groupNode of groupNodes) {
    if (isNodeInsideGroupContent(nodeBox, groupNode)) {
      return groupNode.data.groupId
    }
  }

  return null
}

function isNodeInsideGroupContent(nodeBox, groupNode) {
  const left = groupNode.position.x + 16
  const right = groupNode.position.x + (groupNode.style?.width ?? 0) - 16
  const top = groupNode.position.y + 40
  const bottom = groupNode.position.y + (groupNode.style?.height ?? 0) - 16

  return (
    nodeBox.x >= left &&
    nodeBox.y >= top &&
    nodeBox.x + nodeBox.w <= right &&
    nodeBox.y + nodeBox.h <= bottom
  )
}
