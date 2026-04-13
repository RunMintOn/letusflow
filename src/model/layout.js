import dagre from 'dagre'

const DEFAULT_NODE_WIDTH = 132
const DEFAULT_NODE_HEIGHT = 46
const DECISION_NODE_HEIGHT = 86
const MAX_NODE_WIDTH = 300
const LABEL_CHARACTER_WIDTH = 6.6
const NODE_HORIZONTAL_PADDING = 42
const DAGRE_RANK_SEP = 74
const DAGRE_NODE_SEP = 46
const DAGRE_MARGIN = 48
const MIN_DAGRE_SPACING = 30
const MAX_DAGRE_SPACING = 150
const DEFAULT_DAGRE_SPACING = 100
const DAGRE_FORWARD_EDGE_WEIGHT = 3
const DAGRE_NEUTRAL_EDGE_WEIGHT = 1
const DAGRE_EDGE_MINLEN = 1

export function autoLayoutGraph(graph, options = {}) {
  const spacing = toDagreSpacing(options)
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true })
  dagreGraph.setGraph({
    rankdir: graph.direction === 'TB' || graph.direction === 'TD' ? 'TB' : 'LR',
    ranksep: spacing.ranksep,
    nodesep: spacing.nodesep,
    marginx: DAGRE_MARGIN,
    marginy: DAGRE_MARGIN,
  })
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.nodes) {
    const dimensions = getNodeDimensions(node)
    dagreGraph.setNode(node.id, {
      width: dimensions.w,
      height: dimensions.h,
    })
  }

  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))

  graph.edges.forEach((edge, index) => {
    dagreGraph.setEdge(
      edge.from,
      edge.to,
      toDagreEdgePriority(edge, nodeOrder),
      `${edge.from}->${edge.to}#${index}`,
    )
  })

  dagre.layout(dagreGraph)
  const layout = { nodes: {} }

  for (const node of graph.nodes) {
    const dimensions = getNodeDimensions(node)
    const laidOutNode = dagreGraph.node(node.id) ?? { x: dimensions.w / 2, y: dimensions.h / 2 }
    layout.nodes[node.id] = {
      x: Math.round(laidOutNode.x - dimensions.w / 2),
      y: Math.round(laidOutNode.y - dimensions.h / 2),
      w: dimensions.w,
      h: dimensions.h,
    }
  }

  return layout
}

function getNodeDimensions(node) {
  return {
    w: Math.max(
      DEFAULT_NODE_WIDTH,
      Math.min(MAX_NODE_WIDTH, node.label.length * LABEL_CHARACTER_WIDTH + NODE_HORIZONTAL_PADDING),
    ),
    h: node.type === 'decision' ? DECISION_NODE_HEIGHT : DEFAULT_NODE_HEIGHT,
  }
}

export function toDagreEdgePriority(edge, nodeOrder) {
  const sourceOrder = nodeOrder.get(edge.from)
  const targetOrder = nodeOrder.get(edge.to)

  if (sourceOrder === undefined || targetOrder === undefined) {
    return {
      weight: DAGRE_NEUTRAL_EDGE_WEIGHT,
      minlen: DAGRE_EDGE_MINLEN,
    }
  }

  return {
    weight: sourceOrder <= targetOrder ? DAGRE_FORWARD_EDGE_WEIGHT : DAGRE_NEUTRAL_EDGE_WEIGHT,
    minlen: DAGRE_EDGE_MINLEN,
  }
}

export function toDagreSpacing(options = {}) {
  const spacingPercent = normalizeDagreSpacing(options.spacing)

  return {
    ranksep: Math.round(DAGRE_RANK_SEP * spacingPercent / 100),
    nodesep: Math.round(DAGRE_NODE_SEP * spacingPercent / 100),
  }
}

function normalizeDagreSpacing(value) {
  const spacing = Number(value ?? DEFAULT_DAGRE_SPACING)
  if (!Number.isFinite(spacing)) {
    return DEFAULT_DAGRE_SPACING
  }

  return Math.max(MIN_DAGRE_SPACING, Math.min(MAX_DAGRE_SPACING, spacing))
}
