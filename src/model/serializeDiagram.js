function escapeLabel(label) {
  return String(label)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
}

export function serializeDiagram(graph) {
  const lines = [`dir ${graph.direction}`, '']

  for (const group of graph.groups ?? []) {
    lines.push(`group ${group.id} "${escapeLabel(group.label)}"`)
  }

  if ((graph.groups ?? []).length > 0) {
    lines.push('')
  }

  for (const node of graph.nodes) {
    const groupPart = node.groupId ? ` in ${node.groupId}` : ''
    const typePart = node.type ? ` type=${node.type}` : ''
    const colorPart = node.color ? ` color=${node.color}` : ''
    lines.push(`node ${node.id} "${escapeLabel(node.label)}"${groupPart}${typePart}${colorPart}`)
  }

  lines.push('')

  for (const edge of graph.edges) {
    const labelPart = edge.label ? ` "${escapeLabel(edge.label)}"` : ''
    const stylePart = edge.style ? ` ${edge.style}` : ''
    lines.push(`edge ${edge.from} -> ${edge.to}${labelPart}${stylePart}`)
  }

  return lines.join('\n')
}
