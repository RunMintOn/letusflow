export function autoAssignEdgeSides(graph, nodeLayouts) {
  const layouts = nodeLayouts ?? {}

  return Object.fromEntries(
    (graph.edges ?? []).map((edge) => {
      const edgeId = edge.id ?? `${edge.from}->${edge.to}#${edge.label ?? ''}`
      return [edgeId, toAutoEdgeLayout(edge, layouts)]
    }),
  )
}

function toAutoEdgeLayout(edge, nodeLayouts) {
  const source = nodeLayouts[edge.from]
  const target = nodeLayouts[edge.to]

  if (!source || !target) {
    return { sourceSide: 'right', targetSide: 'left' }
  }

  const sourceCenter = {
    x: source.x + source.w / 2,
    y: source.y + source.h / 2,
  }
  const targetCenter = {
    x: target.x + target.w / 2,
    y: target.y + target.h / 2,
  }
  const deltaX = targetCenter.x - sourceCenter.x
  const deltaY = targetCenter.y - sourceCenter.y

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { sourceSide: 'right', targetSide: 'left' }
      : { sourceSide: 'left', targetSide: 'right' }
  }

  return deltaY >= 0
    ? { sourceSide: 'bottom', targetSide: 'top' }
    : { sourceSide: 'top', targetSide: 'bottom' }
}
