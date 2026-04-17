import { createDefaultGroupLayout } from './layoutSchema.js'

const GROUP_PADDING_X = 24
const GROUP_PADDING_TOP = 42
const GROUP_PADDING_BOTTOM = 24
const GROUP_GAP = 24

export function deriveDefaultGroupBox(groupId, graphNodes, nodeLayouts) {
  const childLayouts = graphNodes
    .filter((node) => node.groupId === groupId)
    .map((node) => nodeLayouts[node.id])
    .filter(Boolean)

  if (childLayouts.length === 0) {
    return null
  }

  const minX = Math.min(...childLayouts.map((layout) => layout.x))
  const minY = Math.min(...childLayouts.map((layout) => layout.y))
  const maxX = Math.max(...childLayouts.map((layout) => layout.x + layout.w))
  const maxY = Math.max(...childLayouts.map((layout) => layout.y + layout.h))

  return createDefaultGroupLayout({
    x: minX - GROUP_PADDING_X,
    y: minY - GROUP_PADDING_TOP,
    w: maxX - minX + GROUP_PADDING_X * 2,
    h: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
  })
}

export function shiftGroupWithChildren(layout, groupId, delta, graph) {
  const nextLayout = {
    ...layout,
    nodes: { ...(layout.nodes ?? {}) },
    groups: { ...(layout.groups ?? {}) },
  }

  const currentGroup = nextLayout.groups[groupId]
  if (!currentGroup) {
    return nextLayout
  }

  nextLayout.groups[groupId] = {
    ...currentGroup,
    x: currentGroup.x + delta.x,
    y: currentGroup.y + delta.y,
  }

  for (const node of graph.nodes ?? []) {
    if (node.groupId !== groupId) {
      continue
    }

    const currentNode = nextLayout.nodes[node.id]
    if (!currentNode) {
      continue
    }

    nextLayout.nodes[node.id] = {
      ...currentNode,
      x: currentNode.x + delta.x,
      y: currentNode.y + delta.y,
    }
  }

  return nextLayout
}

export function separateGroupLayouts(layout, graph, movableGroupIds = []) {
  if (!(graph.groups?.length) || !(movableGroupIds?.length)) {
    return layout
  }

  const nextLayout = {
    ...layout,
    nodes: Object.fromEntries(
      Object.entries(layout.nodes ?? {}).map(([nodeId, box]) => [nodeId, { ...box }]),
    ),
    groups: Object.fromEntries(
      Object.entries(layout.groups ?? {}).map(([groupId, box]) => [groupId, { ...box }]),
    ),
  }
  const movableIds = new Set(movableGroupIds)
  const isVertical = graph.direction === 'TD' || graph.direction === 'TB'
  const primaryAxis = isVertical ? 'y' : 'x'
  const crossAxis = isVertical ? 'x' : 'y'
  const primarySize = isVertical ? 'h' : 'w'
  const crossSize = isVertical ? 'w' : 'h'
  const orderedGroupIds = (graph.groups ?? [])
    .map((group) => group.id)
    .filter((groupId) => nextLayout.groups[groupId])
    .sort((leftId, rightId) => {
      const left = nextLayout.groups[leftId]
      const right = nextLayout.groups[rightId]

      if (left[primaryAxis] !== right[primaryAxis]) {
        return left[primaryAxis] - right[primaryAxis]
      }

      return left[crossAxis] - right[crossAxis]
    })

  for (const groupId of orderedGroupIds) {
    if (!movableIds.has(groupId)) {
      continue
    }

    let unresolved = true
    while (unresolved) {
      unresolved = false

      for (const otherGroupId of orderedGroupIds) {
        if (otherGroupId === groupId) {
          break
        }

        const currentBox = nextLayout.groups[groupId]
        const otherBox = nextLayout.groups[otherGroupId]
        if (!boxesOverlap(currentBox, otherBox)) {
          continue
        }

        const delta = chooseSeparationDelta(
          currentBox,
          otherBox,
          primaryAxis,
          crossAxis,
          primarySize,
          crossSize,
        )
        const shiftedLayout = shiftGroupWithChildren(nextLayout, groupId, delta, graph)
        nextLayout.nodes = shiftedLayout.nodes
        nextLayout.groups = shiftedLayout.groups
        unresolved = true
        break
      }
    }
  }

  return nextLayout
}

export function canDropNodeIntoGroup(nodeBox, groupBox) {
  const left = groupBox.x + 16
  const right = groupBox.x + groupBox.w - 16
  const top = groupBox.y + 40
  const bottom = groupBox.y + groupBox.h - 16

  return (
    nodeBox.x >= left &&
    nodeBox.y >= top &&
    nodeBox.x + nodeBox.w <= right &&
    nodeBox.y + nodeBox.h <= bottom
  )
}

function boxesOverlap(left, right) {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  )
}

function chooseSeparationDelta(
  currentBox,
  otherBox,
  primaryAxis,
  crossAxis,
  primarySize,
  crossSize,
) {
  const primaryOverlap = overlapLength(
    currentBox[primaryAxis],
    currentBox[primaryAxis] + currentBox[primarySize],
    otherBox[primaryAxis],
    otherBox[primaryAxis] + otherBox[primarySize],
  )
  const crossOverlap = overlapLength(
    currentBox[crossAxis],
    currentBox[crossAxis] + currentBox[crossSize],
    otherBox[crossAxis],
    otherBox[crossAxis] + otherBox[crossSize],
  )

  if (primaryOverlap >= crossOverlap) {
    return {
      x: crossAxis === 'x'
        ? otherBox.x + otherBox.w + GROUP_GAP - currentBox.x
        : 0,
      y: crossAxis === 'y'
        ? otherBox.y + otherBox.h + GROUP_GAP - currentBox.y
        : 0,
    }
  }

  return {
    x: primaryAxis === 'x'
      ? otherBox.x + otherBox.w + GROUP_GAP - currentBox.x
      : 0,
    y: primaryAxis === 'y'
      ? otherBox.y + otherBox.h + GROUP_GAP - currentBox.y
      : 0,
  }
}

function overlapLength(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB))
}
