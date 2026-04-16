export function buildRoutingResult(layoutedGraph) {
  const sectionsByEdgeId = {}
  const labelBoxesByEdgeId = {}

  for (const edge of layoutedGraph.edges ?? []) {
    sectionsByEdgeId[edge.id] = edge.sections ?? []

    const label = edge.labels?.[0]
    if (!label) {
      continue
    }

    labelBoxesByEdgeId[edge.id] = {
      x: label.x ?? 0,
      y: label.y ?? 0,
      w: label.width ?? 0,
      h: label.height ?? 0,
    }
  }

  return {
    sectionsByEdgeId,
    labelBoxesByEdgeId,
  }
}
