import React from 'react'
import { ReactFlowProvider, addEdge, useEdgesState, useNodesState } from '@xyflow/react'

import { FlowCanvas } from './components/FlowCanvas.jsx'
import { TopToolbar } from './components/TopToolbar.jsx'
import { InspectorPanel } from './components/InspectorPanel.jsx'
import { DiagramNode } from './components/nodes/DiagramNode.jsx'
import { GroupNode } from './components/nodes/GroupNode.jsx'
import { getVsCodeApi, postToHost } from './bridge/vscodeBridge.js'
import { fromConnectParams } from './mapping/fromConnectParams.js'
import { useEditorState } from './state/useEditorState.jsx'

const nodeTypes = {
  diagramNode: DiagramNode,
  groupNode: GroupNode,
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
  const [selectedNodeId, setSelectedNodeId] = React.useState(null)

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
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )

  const handleNodeClick = React.useCallback((_event, node) => {
    setSelectedNodeId(node.id)
  }, [])

  const handleRenameNode = React.useCallback((nextLabel) => {
    const trimmedLabel = nextLabel.trim()
    if (!selectedNodeId || !trimmedLabel) {
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
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
      nodeId: selectedNodeId,
      label: trimmedLabel,
    })
  }, [selectedNodeId, setNodes])

  const handleCreateNode = React.useCallback(() => {
    postToHost({
      type: 'createNode',
      label: '新节点',
    })
  }, [])

  const handleAutoLayout = React.useCallback(() => {
    postToHost({
      type: 'autoLayout',
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
          type: 'smoothstep',
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

  return (
    <main className="app-shell">
      <TopToolbar
        sourcePath={documentModel.sourcePath}
        onCreateNode={handleCreateNode}
        onAutoLayout={handleAutoLayout}
      />
      <section className="app-main">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
        />
        <InspectorPanel
          selectedNode={selectedNode}
          onRenameNode={handleRenameNode}
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
