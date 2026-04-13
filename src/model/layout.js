import dagre from 'dagre'

const DEFAULT_NODE_WIDTH = 140
const DEFAULT_NODE_HEIGHT = 56
const DAGRE_RANK_SEP = 100
const DAGRE_NODE_SEP = 80
const DAGRE_MARGIN = 80

export function autoLayoutGraph(graph) {
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true })
  dagreGraph.setGraph({
    rankdir: graph.direction === 'TB' ? 'TB' : 'LR',
    ranksep: DAGRE_RANK_SEP,
    nodesep: DAGRE_NODE_SEP,
    marginx: DAGRE_MARGIN,
    marginy: DAGRE_MARGIN,
  })
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.nodes) {
    dagreGraph.setNode(node.id, {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    })
  }

  graph.edges.forEach((edge, index) => {
    dagreGraph.setEdge(edge.from, edge.to, {}, `${edge.from}->${edge.to}#${index}`)
  })

  dagre.layout(dagreGraph)
  const layout = { nodes: {} }

  for (const node of graph.nodes) {
    const laidOutNode = dagreGraph.node(node.id) ?? { x: DEFAULT_NODE_WIDTH / 2, y: DEFAULT_NODE_HEIGHT / 2 }
    layout.nodes[node.id] = {
      x: Math.round(laidOutNode.x - DEFAULT_NODE_WIDTH / 2),
      y: Math.round(laidOutNode.y - DEFAULT_NODE_HEIGHT / 2),
      w: DEFAULT_NODE_WIDTH,
      h: DEFAULT_NODE_HEIGHT,
    }
  }

  return layout
}
