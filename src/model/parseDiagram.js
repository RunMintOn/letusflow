const DIRECTION_PREFIX = 'dir '
const GROUP_PREFIX = 'group '
const NODE_PREFIX = 'node '
const EDGE_PREFIX = 'edge '
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/
const IDENTIFIER_OR_HEX_PATTERN = /^(#[0-9A-Fa-f]{3,8}|[A-Za-z][A-Za-z0-9_-]*)$/
const EDGE_STYLE_PATTERN = 'dashed|dotted|dashdot'

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

    if (line.startsWith('#') || line.startsWith('//')) {
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
      const match = line.match(/^node\s+([A-Za-z0-9_-]+)\s+("(?:(?:\\.)|[^"])*")(.*)$/)
      if (!match) {
        throw new Error(`Invalid node line: ${line}`)
      }

      const [, id, rawLabel, rawOptions] = match
      const label = parseQuotedValue(rawLabel, line)
      const options = parseNodeOptions(rawOptions.trim(), line)
      if (!seenNodes.has(id)) {
        graph.nodes.push({
          id,
          label,
          ...(options.groupId ? { groupId: options.groupId } : {}),
          ...(options.type ? { type: options.type } : {}),
          ...(options.color ? { color: options.color } : {}),
        })
        seenNodes.add(id)
      }
      continue
    }

    if (line.startsWith(EDGE_PREFIX)) {
      const match = line.match(new RegExp(
        `^edge\\s+([A-Za-z0-9_-]+)\\s+->\\s+([A-Za-z0-9_-]+)(?:\\s+("(?:(?:\\\\.)|[^"])*"))?(?:\\s+(${EDGE_STYLE_PATTERN}))?$`,
      ))
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

function parseNodeOptions(rawOptions, line) {
  if (!rawOptions) {
    return {}
  }

  const options = {}
  const tokens = rawOptions.split(/\s+/)

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index]

    if (token === 'in') {
      const groupId = tokens[index + 1]
      if (!groupId || !IDENTIFIER_PATTERN.test(groupId) || options.groupId) {
        throw new Error(`Invalid node line: ${line}`)
      }
      options.groupId = groupId
      index += 2
      continue
    }

    if (token.startsWith('type=')) {
      const type = token.slice('type='.length)
      if (!type || !IDENTIFIER_PATTERN.test(type) || options.type) {
        throw new Error(`Invalid node line: ${line}`)
      }
      options.type = type
      index += 1
      continue
    }

    if (token.startsWith('color=') || token.startsWith('colour=')) {
      const [, color] = token.split('=')
      if (!color || !IDENTIFIER_OR_HEX_PATTERN.test(color) || options.color) {
        throw new Error(`Invalid node line: ${line}`)
      }
      options.color = color
      index += 1
      continue
    }

    throw new Error(`Invalid node line: ${line}`)
  }

  return options
}
