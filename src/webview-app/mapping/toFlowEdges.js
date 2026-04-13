export function toFlowEdges(graphEdges) {
  return graphEdges.map((edge, index) => ({
    id: `${edge.from}->${edge.to}#${index}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: 'smoothstep',
  }))
}
