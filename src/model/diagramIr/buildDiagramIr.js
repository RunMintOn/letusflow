import { normalizeDiagramIr } from './normalizeDiagramIr.js'

export function buildDiagramIr(graph) {
  const normalized = normalizeDiagramIr(graph)
  const nodeGroupById = new Map(normalized.nodes.map((node) => [node.id, node.groupId]))
  const groupsById = new Map(
    normalized.groups.map((group) => [group.id, { ...group, childNodeIds: [] }]),
  )

  for (const node of normalized.nodes) {
    if (!node.groupId || !groupsById.has(node.groupId)) {
      continue
    }

    groupsById.get(node.groupId).childNodeIds.push(node.id)
  }

  const edges = normalized.edges.map((edge) => {
    const sourceGroupId = nodeGroupById.get(edge.from) ?? null
    const targetGroupId = nodeGroupById.get(edge.to) ?? null

    return {
      ...edge,
      semantic: {
        isCrossGroup: sourceGroupId !== targetGroupId,
      },
    }
  })

  return {
    direction: normalized.direction,
    nodes: normalized.nodes,
    edges,
    groups: Array.from(groupsById.values()),
  }
}
