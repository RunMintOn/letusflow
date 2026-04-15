export function derivePrimaryFlow(graph) {
  const realNodes = graph.nodes.filter((node) => !node.isLabelNode)
  const nodeOrder = new Map(realNodes.map((node, index) => [node.id, index]))
  const incoming = new Map(realNodes.map((node) => [node.id, []]))
  const outgoing = new Map(realNodes.map((node) => [node.id, []]))

  for (const edge of graph.edges) {
    incoming.get(edge.to)?.push(edge)
    outgoing.get(edge.from)?.push(edge)
  }

  const scores = {}

  for (const node of graph.nodes) {
    if (node.isLabelNode) {
      continue
    }

    const incomingEdges = incoming.get(node.id) ?? []
    const outgoingEdges = outgoing.get(node.id) ?? []

    let score = 0
    score += outgoingEdges.filter((edge) => isForwardEdge(edge, nodeOrder)).length * 3
    score += incomingEdges.filter((edge) => isForwardEdge(edge, nodeOrder)).length * 2
    score -= incomingEdges.filter((edge) => !isForwardEdge(edge, nodeOrder)).length * 2
    score -= outgoingEdges.filter((edge) => !isForwardEdge(edge, nodeOrder)).length

    scores[node.id] = score
  }

  return scores
}

function isForwardEdge(edge, nodeOrder) {
  return (nodeOrder.get(edge.from) ?? -1) <= (nodeOrder.get(edge.to) ?? -1)
}
