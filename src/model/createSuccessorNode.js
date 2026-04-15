import { createEdge } from './createEdge.js'
import { createEdgeId } from './withEdgeIds.js'

export function createSuccessorNode(graph, fromNodeId, newNode, newEdgeId = createEdgeId(graph.edges)) {
  const parentIndex = graph.nodes.findIndex((node) => node.id === fromNodeId)
  const nextNodes = parentIndex === -1
    ? [...graph.nodes, newNode]
    : [
        ...graph.nodes.slice(0, parentIndex + 1),
        newNode,
        ...graph.nodes.slice(parentIndex + 1),
      ]

  return createEdge(
    {
      ...graph,
      nodes: nextNodes,
    },
    { id: newEdgeId, from: fromNodeId, to: newNode.id, label: undefined },
  )
}
