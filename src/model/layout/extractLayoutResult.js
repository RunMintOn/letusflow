function collectNodeLayouts(children, result, offsetX = 0, offsetY = 0) {
  for (const child of children ?? []) {
    const absoluteX = (child.x ?? 0) + offsetX
    const absoluteY = (child.y ?? 0) + offsetY

    if (child.children?.length) {
      result.groups[child.id.replace('group:', '')] = {
        x: absoluteX,
        y: absoluteY,
        w: child.width ?? 0,
        h: child.height ?? 0,
        label: child.labels?.[0]?.text ?? '',
      }
      collectNodeLayouts(child.children, result, absoluteX, absoluteY)
      continue
    }

    result.nodes[child.id] = {
      x: absoluteX,
      y: absoluteY,
      w: child.width ?? 0,
      h: child.height ?? 0,
    }
  }
}

export function extractLayoutResult(layoutedGraph) {
  const result = {
    nodes: {},
    groups: {},
    edgeLabels: {},
    sections: {},
  }

  collectNodeLayouts(layoutedGraph.children, result)

  for (const edge of layoutedGraph.edges ?? []) {
    result.sections[edge.id] = edge.sections ?? []

    const label = edge.labels?.[0]
    if (!label) {
      continue
    }

    result.edgeLabels[edge.id] = {
      x: label.x ?? 0,
      y: label.y ?? 0,
      w: label.width ?? 0,
      h: label.height ?? 0,
    }
  }

  return result
}
