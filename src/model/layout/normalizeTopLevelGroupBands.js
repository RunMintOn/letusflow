const GROUP_BAND_GAP = 72

export function normalizeTopLevelGroupBands(ir, layoutResult) {
  if (ir.direction !== 'TD' && ir.direction !== 'TB') {
    return layoutResult
  }

  const orderedGroups = ir.groups
    .filter((group) => !group.parentGroupId)
    .filter((group) => layoutResult.groups?.[group.id])

  if (orderedGroups.length <= 1) {
    return layoutResult
  }

  const nextLayout = {
    ...layoutResult,
    nodes: { ...(layoutResult.nodes ?? {}) },
    groups: { ...(layoutResult.groups ?? {}) },
  }

  let cursorY = Math.min(...orderedGroups.map((group) => nextLayout.groups[group.id].y))

  for (const group of orderedGroups) {
    const currentGroup = nextLayout.groups[group.id]
    const deltaY = cursorY - currentGroup.y

    if (deltaY !== 0) {
      nextLayout.groups[group.id] = {
        ...currentGroup,
        y: currentGroup.y + deltaY,
      }

      for (const node of ir.nodes) {
        if (node.groupId !== group.id || !nextLayout.nodes[node.id]) {
          continue
        }

        nextLayout.nodes[node.id] = {
          ...nextLayout.nodes[node.id],
          y: nextLayout.nodes[node.id].y + deltaY,
        }
      }
    }

    cursorY = nextLayout.groups[group.id].y + nextLayout.groups[group.id].h + GROUP_BAND_GAP
  }

  return nextLayout
}

export function applyTopLevelGroupBandRoutingShifts(ir, previousLayoutResult, nextLayoutResult, routingResult) {
  const nodeGroupById = new Map(ir.nodes.map((node) => [node.id, node.groupId ?? null]))
  const groupShiftById = new Map()

  for (const group of ir.groups) {
    const previous = previousLayoutResult.groups?.[group.id]
    const next = nextLayoutResult.groups?.[group.id]

    if (!previous || !next) {
      continue
    }

    groupShiftById.set(group.id, {
      x: next.x - previous.x,
      y: next.y - previous.y,
    })
  }

  const sectionsByEdgeId = {}
  const labelBoxesByEdgeId = {}

  for (const edge of ir.edges) {
    const sourceShift = groupShiftById.get(nodeGroupById.get(edge.from)) ?? { x: 0, y: 0 }
    const targetShift = groupShiftById.get(nodeGroupById.get(edge.to)) ?? { x: 0, y: 0 }
    const sections = routingResult.sectionsByEdgeId?.[edge.id] ?? []

    sectionsByEdgeId[edge.id] = sections.map((section) => ({
      startPoint: shiftPoint(section.startPoint, sourceShift),
      bendPoints: (section.bendPoints ?? []).map((point, index, points) =>
        shiftPoint(point, interpolateShift(sourceShift, targetShift, (index + 1) / (points.length + 1))),
      ),
      endPoint: shiftPoint(section.endPoint, targetShift),
    }))

    const labelBox = routingResult.labelBoxesByEdgeId?.[edge.id]
    if (labelBox) {
      const averageShift = interpolateShift(sourceShift, targetShift, 0.5)
      labelBoxesByEdgeId[edge.id] = {
        x: labelBox.x + averageShift.x,
        y: labelBox.y + averageShift.y,
        w: labelBox.w,
        h: labelBox.h,
      }
    }
  }

  return {
    sectionsByEdgeId,
    labelBoxesByEdgeId,
  }
}

function interpolateShift(fromShift, toShift, t) {
  return {
    x: Math.round(fromShift.x + (toShift.x - fromShift.x) * t),
    y: Math.round(fromShift.y + (toShift.y - fromShift.y) * t),
  }
}

function shiftPoint(point, shift) {
  if (!point) {
    return point
  }

  return {
    x: Math.round(point.x + shift.x),
    y: Math.round(point.y + shift.y),
  }
}
