import { applyGroupMargins } from './applyGroupMargins.js'
import dagre from 'dagre'
import { buildLabelAugmentedGraph } from './buildLabelAugmentedGraph.js'
import { autoAssignEdgeSides } from './autoAssignEdgeSides.js'
import { derivePrimaryFlow } from './derivePrimaryFlow.js'
import { getNodeDimensions } from './nodeDimensions.js'
import { postLayoutRanks } from './postLayoutRanks.js'

const DAGRE_RANK_SEP = 64
const DAGRE_NODE_SEP = 34
const DAGRE_MARGIN = 32
const MIN_DAGRE_SPACING = 30
const MAX_DAGRE_SPACING = 150
const DEFAULT_DAGRE_SPACING = 100
const DAGRE_FORWARD_EDGE_WEIGHT = 3
const DAGRE_NEUTRAL_EDGE_WEIGHT = 1
const DAGRE_EDGE_MINLEN = 1

export function autoLayoutGraph(graph, options = {}) {
  const spacing = toDagreSpacing(options)
  const { graph: augmentedGraph, edgeLabelMap } = buildLabelAugmentedGraph(graph)
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true })
  dagreGraph.setGraph({
    rankdir: graph.direction === 'TB' || graph.direction === 'TD' ? 'TB' : 'LR',
    ranksep: spacing.ranksep,
    nodesep: spacing.nodesep,
    marginx: DAGRE_MARGIN,
    marginy: DAGRE_MARGIN,
  })
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  for (const node of augmentedGraph.nodes) {
    const dimensions = node.isLabelNode ? node.labelDimensions : getNodeDimensions(node)
    dagreGraph.setNode(node.id, {
      width: dimensions.w,
      height: dimensions.h,
    })
  }

  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]))

  augmentedGraph.edges.forEach((edge, index) => {
    const edgePriority = toDagreEdgePriority(edge, nodeOrder)
    dagreGraph.setEdge(
      edge.from,
      edge.to,
      {
        ...edgePriority,
        minlen: edge.isLabelSegment ? 0 : edgePriority.minlen,
      },
      `${edge.from}->${edge.to}#${index}`,
    )
  })

  dagre.layout(dagreGraph)
  const layout = { nodes: {}, edges: {}, edgeLabels: {} }

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

  for (const [edgeKey, meta] of Object.entries(edgeLabelMap)) {
    const laidOutNode = dagreGraph.node(meta.labelNodeId)
    if (!laidOutNode) {
      continue
    }

    layout.edgeLabels[edgeKey] = {
      x: Math.round(laidOutNode.x - meta.labelDimensions.w / 2),
      y: Math.round(laidOutNode.y - meta.labelDimensions.h / 2),
      w: meta.labelDimensions.w,
      h: meta.labelDimensions.h,
    }
  }

  layout.edges = autoAssignEdgeSides(graph, layout.nodes)

  const primaryFlowScores = derivePrimaryFlow(graph)
  const postLayout = postLayoutRanks(graph, layout, spacing, primaryFlowScores)

  return applyGroupMargins(graph, postLayout)
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
