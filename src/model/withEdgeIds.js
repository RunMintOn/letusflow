const EDGE_ID_PREFIX = 'edge_'

export function withEdgeIds(graph) {
  let nextCounter = 1

  const edges = (graph.edges ?? []).map((edge) => {
    if (edge.id) {
      nextCounter = Math.max(nextCounter, toEdgeNumber(edge.id) + 1)
      return edge
    }

    const id = `${EDGE_ID_PREFIX}${nextCounter}`
    nextCounter += 1
    return { ...edge, id }
  })

  return {
    ...graph,
    edges,
  }
}

export function createEdgeId(edges) {
  const maxEdgeNumber = (edges ?? []).reduce(
    (max, edge) => Math.max(max, toEdgeNumber(edge.id)),
    0,
  )

  return `${EDGE_ID_PREFIX}${maxEdgeNumber + 1}`
}

function toEdgeNumber(edgeId) {
  if (typeof edgeId !== 'string' || !edgeId.startsWith(EDGE_ID_PREFIX)) {
    return 0
  }

  const value = Number(edgeId.slice(EDGE_ID_PREFIX.length))
  return Number.isFinite(value) ? value : 0
}
