export function postLayoutRanks(graph, layout, spacing, primaryFlowScores) {
  const isVertical = graph.direction === 'TD' || graph.direction === 'TB'
  const primaryAxis = isVertical ? 'y' : 'x'
  const crossAxis = isVertical ? 'x' : 'y'
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const rankTolerance = Math.max(8, Math.round(spacing.ranksep * 0.25))
  const ranks = []
  const nextLayout = {
    nodes: Object.fromEntries(
      Object.entries(layout.nodes).map(([nodeId, box]) => [nodeId, { ...box }]),
    ),
  }

  for (const node of graph.nodes) {
    const box = nextLayout.nodes[node.id]
    if (!box) {
      continue
    }

    const axisValue = box[primaryAxis]
    let rank = ranks.find((entry) => Math.abs(entry.axisValue - axisValue) <= rankTolerance)

    if (!rank) {
      rank = { axisValue, nodeIds: [] }
      ranks.push(rank)
    }

    rank.nodeIds.push(node.id)
  }

  for (const rank of ranks) {
    const orderedIds = [...rank.nodeIds].sort((leftId, rightId) => {
      const leftScore = primaryFlowScores[leftId] ?? 0
      const rightScore = primaryFlowScores[rightId] ?? 0

      if (leftScore !== rightScore) {
        return rightScore - leftScore
      }

      return (nodeOrder.get(leftId) ?? 0) - (nodeOrder.get(rightId) ?? 0)
    })

    const primaryBaseline = orderedIds
      .map((nodeId) => nextLayout.nodes[nodeId]?.[primaryAxis] ?? 0)
      .sort((left, right) => left - right)[0] ?? 0
    const crossBaseline = orderedIds
      .map((nodeId) => nextLayout.nodes[nodeId]?.[crossAxis] ?? 0)
      .sort((left, right) => left - right)[0] ?? 0

    let cursor = crossBaseline
    for (const nodeId of orderedIds) {
      const box = nextLayout.nodes[nodeId]
      box[primaryAxis] = primaryBaseline
      box[crossAxis] = cursor
      cursor += (isVertical ? box.w : box.h) + spacing.nodesep
    }
  }

  return nextLayout
}
