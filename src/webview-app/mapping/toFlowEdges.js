export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge) => ({
    id: `${edge.from}->${edge.to}#${edge.label ?? ''}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: 'smoothstep',
  }))
}
