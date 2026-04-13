function escapeLabel(label) {
  return String(label)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
}

export function serializeDiagram(graph) {
  const lines = [`dir ${graph.direction}`, '']

  for (const node of graph.nodes) {
    lines.push(`node ${node.id} "${escapeLabel(node.label)}"`)
  }

  lines.push('')

  for (const edge of graph.edges) {
    const labelPart = edge.label ? ` "${escapeLabel(edge.label)}"` : ''
    lines.push(`edge ${edge.from} -> ${edge.to}${labelPart}`)
  }

  return lines.join('\n')
}
