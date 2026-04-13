const DEFAULT_NODE_WIDTH = 140
const DEFAULT_NODE_HEIGHT = 56
const DEFAULT_GAP_X = 220

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
