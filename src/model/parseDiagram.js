const DIRECTION_PREFIX = 'dir '
const GROUP_PREFIX = 'group '
const NODE_PREFIX = 'node '
const EDGE_PREFIX = 'edge '

function parseQuotedValue(rawValue, line) {
  if (!rawValue.startsWith('"') || !rawValue.endsWith('"')) {
    throw new Error(`Invalid quoted value: ${line}`)
  }

  let result = ''
  let escaping = false

  for (let index = 1; index < rawValue.length - 1; index += 1) {
    const character = rawValue[index]
    if (escaping) {
      result += character
      escaping = false
      continue
    }

    if (character === '\\') {
      escaping = true
      continue
    }

    result += character
  }

  if (escaping) {
    throw new Error(`Invalid escape sequence: ${line}`)
  }

  return result
}

export function parseDiagram(source) {
  const graph = {
    direction: 'LR',
    groups: [],
    nodes: [],
    edges: [],
  }

  const seenGroups = new Set()
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

    if (line.startsWith(GROUP_PREFIX)) {
      const match = line.match(/^group\s+([A-Za-z0-9_-]+)\s+("(?:(?:\\.)|[^"])*")$/)
      if (!match) {
        throw new Error(`Invalid group line: ${line}`)
      }

      const [, id, rawLabel] = match
      const label = parseQuotedValue(rawLabel, line)
      if (!seenGroups.has(id)) {
        graph.groups.push({ id, label })
        seenGroups.add(id)
      }
      continue
    }

    if (line.startsWith(NODE_PREFIX)) {
      const match = line.match(/^node\s+([A-Za-z0-9_-]+)\s+("(?:(?:\\.)|[^"])*")(?:\s+in\s+([A-Za-z0-9_-]+))?$/)
      if (!match) {
        throw new Error(`Invalid node line: ${line}`)
      }

      const [, id, rawLabel, groupId] = match
      const label = parseQuotedValue(rawLabel, line)
      if (!seenNodes.has(id)) {
        graph.nodes.push(groupId ? { id, label, groupId } : { id, label })
        seenNodes.add(id)
      }
      continue
    }

    if (line.startsWith(EDGE_PREFIX)) {
      const match = line.match(/^edge\s+([A-Za-z0-9_-]+)\s+->\s+([A-Za-z0-9_-]+)(?:\s+("(?:(?:\\.)|[^"])*"))?(?:\s+(dashed))?$/)
      if (!match) {
        throw new Error(`Invalid edge line: ${line}`)
      }

      const [, from, to, rawLabel, style] = match
      const edge = {
        from,
        to,
        label: rawLabel ? parseQuotedValue(rawLabel, line) : undefined,
      }
      if (style) {
        edge.style = style
      }
      graph.edges.push(edge)
      continue
    }

    throw new Error(`Unknown line: ${line}`)
  }

  return graph
}
