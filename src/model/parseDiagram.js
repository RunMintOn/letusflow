const DIRECTION_PREFIX = 'dir '
const NODE_PREFIX = 'node '
const EDGE_PREFIX = 'edge '

export function parseDiagram(source) {
  const graph = {
    direction: 'LR',
    nodes: [],
    edges: [],
  }

  const seenNodes = new Set()
  const lines = source.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (line.startsWith(DIRECTION_PREFIX)) {
      graph.direction = line.slice(DIRECTION_PREFIX.length).trim() || 'LR'
      continue
    }

    if (line.startsWith(NODE_PREFIX)) {
      const match = line.match(/^node\s+([A-Za-z0-9_-]+)\s+"([^"]+)"$/)
      if (!match) {
        throw new Error(`Invalid node line: ${line}`)
      }

      const [, id, label] = match
      if (!seenNodes.has(id)) {
        graph.nodes.push({ id, label })
        seenNodes.add(id)
      }
      continue
    }

    if (line.startsWith(EDGE_PREFIX)) {
      const match = line.match(/^edge\s+([A-Za-z0-9_-]+)\s+->\s+([A-Za-z0-9_-]+)(?:\s+"([^"]+)")?$/)
      if (!match) {
        throw new Error(`Invalid edge line: ${line}`)
      }

      const [, from, to, label] = match
      graph.edges.push({
        from,
        to,
        label,
      })
      continue
    }

    throw new Error(`Unknown line: ${line}`)
  }

  return graph
}
