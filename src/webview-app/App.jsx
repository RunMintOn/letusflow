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
  }

  const { documentModel, flowNodes, flowEdges } = useEditorState(initialDocument)
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

  const handleConnect = React.useCallback((connection) => {
    if (!connection?.source || !connection?.target) {
      return
    }

    setEdges((currentEdges) =>
      addEdge(
        {
          source: connection.source,
          target: connection.target,
          type: 'straight',
        },
        currentEdges,
      ),
    )

    postToHost({
      type: 'createEdge',
      edge: fromConnectParams(connection),
    })
  }, [setEdges])

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
        onCreateNode={handleCreateNode}
        onAutoLayout={handleAutoLayout}
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
