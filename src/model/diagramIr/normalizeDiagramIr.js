export function normalizeDiagramIr(input) {
  return {
    direction: input.direction === 'LR' ? 'LR' : 'TD',
    nodes: (input.nodes ?? []).map((node) => ({
      id: node.id,
      label: node.label ?? node.id,
      type: node.type ?? 'default',
      groupId: node.groupId ?? null,
      style: {
        color: node.color ?? null,
      },
    })),
    edges: (input.edges ?? []).map((edge) => ({
      id: edge.id ?? `${edge.from}->${edge.to}#${edge.label ?? ''}`,
      from: edge.from,
      to: edge.to,
      label: edge.label ?? null,
      style: {
        pattern: edge.style ?? 'solid',
      },
      semantic: {
        isCrossGroup: false,
      },
    })),
    groups: (input.groups ?? []).map((group) => ({
      id: group.id,
      label: group.label ?? group.id,
      parentGroupId: group.parentGroupId ?? null,
      childNodeIds: [],
    })),
  }
}
