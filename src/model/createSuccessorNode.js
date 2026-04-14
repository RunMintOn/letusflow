import { createEdge } from './createEdge.js'

export function createSuccessorNode(graph, fromNodeId, newNode) {
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
    { from: fromNodeId, to: newNode.id, label: undefined },
  )
}
