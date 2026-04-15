const MIN_EDGE_LABEL_WIDTH = 52
const EDGE_LABEL_HEIGHT = 24
const EDGE_LABEL_HORIZONTAL_PADDING = 20
const EDGE_LABEL_CHARACTER_WIDTH = 7

export function getEdgeLabelDimensions(label) {
  const text = String(label ?? '')

  return {
    w: Math.max(
      MIN_EDGE_LABEL_WIDTH,
      Math.round(text.length * EDGE_LABEL_CHARACTER_WIDTH + EDGE_LABEL_HORIZONTAL_PADDING),
    ),
    h: EDGE_LABEL_HEIGHT,
  }
}
