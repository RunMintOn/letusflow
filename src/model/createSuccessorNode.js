import { createEdge } from './createEdge.js'
import { createNode } from './createNode.js'

export function createSuccessorNode(graph, fromNodeId, newNode) {
  return createEdge(
    createNode(graph, newNode),
    { from: fromNodeId, to: newNode.id, label: undefined },
  )
}
