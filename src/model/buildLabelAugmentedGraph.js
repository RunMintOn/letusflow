import { getEdgeLabelDimensions } from './edgeLabelDimensions.js'

export function buildLabelAugmentedGraph(graph) {
  const nextNodes = [...graph.nodes]
  const nextEdges = []
  const edgeLabelMap = {}

  for (const edge of graph.edges) {
    const edgeKey = toEdgeKey(edge)
    const hasLabel = typeof edge.label === 'string' && edge.label.trim().length > 0

    if (!hasLabel) {
      nextEdges.push(edge)
      continue
    }

    const labelNodeId = `__edge_label__:${edgeKey}`
    const labelDimensions = getEdgeLabelDimensions(edge.label)

    nextNodes.push({
      id: labelNodeId,
      label: edge.label,
      isLabelNode: true,
      labelDimensions,
    })

    nextEdges.push({ from: edge.from, to: labelNodeId, isLabelSegment: true })
    nextEdges.push({ from: labelNodeId, to: edge.to, isLabelSegment: true })

    edgeLabelMap[edgeKey] = {
      originalEdge: edge,
      labelNodeId,
      labelDimensions,
    }
  }

  return {
    graph: {
      ...graph,
      nodes: nextNodes,
      edges: nextEdges,
    },
    edgeLabelMap,
  }
}

export function toEdgeKey(edge) {
  return `${edge.from}->${edge.to}#${edge.label ?? ''}`
}
