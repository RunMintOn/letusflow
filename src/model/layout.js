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

export function autoLayoutGraph(graph) {
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true })
  dagreGraph.setGraph({
    rankdir: graph.direction === 'TB' || graph.direction === 'TD' ? 'TB' : 'LR',
    ranksep: DAGRE_RANK_SEP,
    nodesep: DAGRE_NODE_SEP,
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

  graph.edges.forEach((edge, index) => {
    dagreGraph.setEdge(edge.from, edge.to, {}, `${edge.from}->${edge.to}#${index}`)
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
