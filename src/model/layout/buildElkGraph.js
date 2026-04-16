import { getNodeDimensions } from '../nodeDimensions.js'

function toElkNode(node) {
  const dimensions = getNodeDimensions(node)

  return {
    id: node.id,
    width: dimensions.w,
    height: dimensions.h,
    labels: [{ text: node.label }],
  }
}

export function buildElkGraph(ir) {
  const topLevelNodes = ir.nodes
    .filter((node) => !node.groupId)
    .map((node) => toElkNode(node))

  const groupChildren = ir.groups.map((group) => ({
    id: `group:${group.id}`,
    labels: [{ text: group.label }],
    children: ir.nodes
      .filter((node) => node.groupId === group.id)
      .map((node) => toElkNode(node)),
  }))

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ir.direction === 'LR' ? 'RIGHT' : 'DOWN',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: [...groupChildren, ...topLevelNodes],
    edges: ir.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.from],
      targets: [edge.to],
      labels: edge.label ? [{ text: edge.label }] : [],
    })),
  }
}
