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

  const orderingEdges = buildGroupOrderingEdges(ir)

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ir.direction === 'LR' ? 'RIGHT' : 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.padding': '[top=50,left=50,bottom=50,right=50]',
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
    },
    children: [...groupChildren, ...topLevelNodes],
    edges: [
      ...ir.edges.map((edge) => ({
        id: edge.id,
        sources: [edge.from],
        targets: [edge.to],
        labels: edge.label ? [{ text: edge.label }] : [],
      })),
      ...orderingEdges,
    ],
  }
}

function buildGroupOrderingEdges(ir) {
  const groupedNodeIds = new Map()

  for (const group of ir.groups) {
    const firstNode = ir.nodes.find((node) => node.groupId === group.id)
    if (firstNode) {
      groupedNodeIds.set(group.id, firstNode.id)
    }
  }

  const orderedGroups = ir.groups.filter((group) => groupedNodeIds.has(group.id))
  const edges = []

  for (let index = 0; index < orderedGroups.length - 1; index += 1) {
    const fromGroup = orderedGroups[index]
    const toGroup = orderedGroups[index + 1]

    edges.push({
      id: `__order__:${fromGroup.id}->${toGroup.id}`,
      sources: [groupedNodeIds.get(fromGroup.id)],
      targets: [groupedNodeIds.get(toGroup.id)],
      layoutOptions: {
        'elk.priority': '1',
      },
    })
  }

  return edges
}
