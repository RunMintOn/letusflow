export function buildEdgeGeometry(fromLayout, toLayout) {
  const round = (value) => Math.round(value)
  const fromCenter = {
    x: fromLayout.x + fromLayout.w / 2,
    y: fromLayout.y + fromLayout.h / 2,
  }
  const toCenter = {
    x: toLayout.x + toLayout.w / 2,
    y: toLayout.y + toLayout.h / 2,
  }

  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y
  const prefersVertical = Math.abs(dy) > Math.abs(dx)

  if (prefersVertical) {
    const start = {
      x: fromCenter.x,
      y: dy >= 0 ? fromLayout.y + fromLayout.h : fromLayout.y,
    }
    const end = {
      x: toCenter.x,
      y: dy >= 0 ? toLayout.y : toLayout.y + toLayout.h,
    }

    if (Math.abs(start.x - end.x) <= 8) {
      return {
        path: `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`,
        label: {
          x: round(start.x + 14),
          y: round((start.y + end.y) / 2),
          textAnchor: 'start',
        },
      }
    }

    const midY = round((start.y + end.y) / 2)
    return {
      path: `M ${round(start.x)} ${round(start.y)} L ${round(start.x)} ${midY} L ${round(end.x)} ${midY} L ${round(end.x)} ${round(end.y)}`,
      label: {
        x: round((start.x + end.x) / 2),
        y: midY - 10,
        textAnchor: 'middle',
      },
    }
  }

  const start = {
    x: dx >= 0 ? fromLayout.x + fromLayout.w : fromLayout.x,
    y: fromCenter.y,
  }
  const end = {
    x: dx >= 0 ? toLayout.x : toLayout.x + toLayout.w,
    y: toCenter.y,
  }

  if (Math.abs(start.y - end.y) <= 8) {
    return {
      path: `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`,
      label: {
        x: round((start.x + end.x) / 2),
        y: round(start.y - 14),
        textAnchor: 'middle',
      },
    }
  }

  const midX = round((start.x + end.x) / 2)
  return {
    path: `M ${round(start.x)} ${round(start.y)} L ${midX} ${round(start.y)} L ${midX} ${round(end.y)} L ${round(end.x)} ${round(end.y)}`,
    label: {
      x: midX + (dx >= 0 ? 10 : -10),
      y: round((start.y + end.y) / 2) - 10,
      textAnchor: dx >= 0 ? 'start' : 'end',
    },
  }
}
