const DEFAULT_NODE_WIDTH = 140
const DEFAULT_NODE_HEIGHT = 56
const DEFAULT_GAP_X = 220
const AUTO_LAYOUT_START_X = 80
const AUTO_LAYOUT_START_Y = 120
const AUTO_LAYOUT_COL_GAP = 240
const AUTO_LAYOUT_ROW_GAP = 160

export function preserveLayout(previous, graph) {
  const existing = previous?.nodes ?? {}
  const next = { nodes: {} }

  let fallbackX = 10
  let fallbackY = 20

  for (const node of graph.nodes) {
    const known = existing[node.id]
    if (known) {
      next.nodes[node.id] = known
      fallbackX = known.x + DEFAULT_GAP_X
      fallbackY = known.y
      continue
    }

    next.nodes[node.id] = {
      x: fallbackX,
      y: fallbackY,
      w: DEFAULT_NODE_WIDTH,
      h: DEFAULT_NODE_HEIGHT,
    }
    fallbackX += DEFAULT_GAP_X
  }

  return next
}

export function applyMovedNodes(layout, movedNodes) {
  const next = {
    nodes: { ...layout.nodes },
  }

  for (const moved of movedNodes) {
    const current = next.nodes[moved.id]
    if (!current || !moved.position) {
      continue
    }

    next.nodes[moved.id] = {
      ...current,
      x: Math.round(moved.position.x),
      y: Math.round(moved.position.y),
    }
  }

  return next
}

export function createLayoutForNode(layout, nodeId) {
  const next = {
    nodes: { ...(layout?.nodes ?? {}) },
  }

  const existingNodes = Object.values(next.nodes)
  const rightmostNode = existingNodes.reduce((currentRightmost, node) => {
    if (!currentRightmost) {
      return node
    }

    return node.x > currentRightmost.x ? node : currentRightmost
  }, null)

  next.nodes[nodeId] = {
    x: rightmostNode ? rightmostNode.x + DEFAULT_GAP_X : 10,
    y: rightmostNode ? rightmostNode.y : 20,
    w: DEFAULT_NODE_WIDTH,
    h: DEFAULT_NODE_HEIGHT,
  }

  return next
}

export function autoLayoutGraph(graph) {
  const levelByNodeId = computeNodeLevels(graph)
  const nodesByLevel = new Map()
  const incomingRankByNodeId = computeIncomingRank(graph)

  for (const node of graph.nodes) {
    const level = levelByNodeId.get(node.id) ?? 0
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, [])
    }
    nodesByLevel.get(level).push(node)
  }

  const layout = { nodes: {} }
  const orderedLevels = [...nodesByLevel.keys()].sort((left, right) => left - right)

  for (const level of orderedLevels) {
    const nodesAtLevel = (nodesByLevel.get(level) ?? []).slice().sort((left, right) => {
      const leftRank = incomingRankByNodeId.get(left.id) ?? Number.MAX_SAFE_INTEGER
      const rightRank = incomingRankByNodeId.get(right.id) ?? Number.MAX_SAFE_INTEGER
      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return graph.nodes.findIndex((node) => node.id === left.id) - graph.nodes.findIndex((node) => node.id === right.id)
    })
    nodesAtLevel.forEach((node, index) => {
      if (graph.direction === 'TB') {
        layout.nodes[node.id] = {
          x: AUTO_LAYOUT_START_X + index * AUTO_LAYOUT_COL_GAP,
          y: AUTO_LAYOUT_START_Y + level * AUTO_LAYOUT_ROW_GAP,
          w: DEFAULT_NODE_WIDTH,
          h: DEFAULT_NODE_HEIGHT,
        }
        return
      }

      layout.nodes[node.id] = {
        x: AUTO_LAYOUT_START_X + level * AUTO_LAYOUT_COL_GAP,
        y: AUTO_LAYOUT_START_Y + index * AUTO_LAYOUT_ROW_GAP,
        w: DEFAULT_NODE_WIDTH,
        h: DEFAULT_NODE_HEIGHT,
      }
    })
  }

  return layout
}

function computeIncomingRank(graph) {
  const rankByNodeId = new Map()

  graph.edges.forEach((edge, index) => {
    if (!rankByNodeId.has(edge.to)) {
      rankByNodeId.set(edge.to, index)
    }
  })

  return rankByNodeId
}

function computeNodeLevels(graph) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
  const indegreeById = new Map(graph.nodes.map((node) => [node.id, 0]))
  const outgoingById = new Map(graph.nodes.map((node) => [node.id, []]))

  for (const edge of graph.edges) {
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) {
      continue
    }

    outgoingById.get(edge.from).push(edge.to)
    indegreeById.set(edge.to, (indegreeById.get(edge.to) ?? 0) + 1)
  }

  const queue = graph.nodes
    .filter((node) => (indegreeById.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
  const levelByNodeId = new Map(graph.nodes.map((node) => [node.id, 0]))
  const visited = new Set()

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId) {
      continue
    }

    visited.add(nodeId)
    const currentLevel = levelByNodeId.get(nodeId) ?? 0

    for (const targetId of outgoingById.get(nodeId) ?? []) {
      levelByNodeId.set(targetId, Math.max(levelByNodeId.get(targetId) ?? 0, currentLevel + 1))
      indegreeById.set(targetId, (indegreeById.get(targetId) ?? 0) - 1)
      if ((indegreeById.get(targetId) ?? 0) === 0) {
        queue.push(targetId)
      }
    }
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id) && !levelByNodeId.has(node.id)) {
      levelByNodeId.set(node.id, 0)
    }
  }

  return levelByNodeId
}
