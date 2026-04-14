const DEFAULT_NODE_WIDTH = 132
const DEFAULT_NODE_HEIGHT = 46
const DECISION_NODE_HEIGHT = 86
const MAX_NODE_WIDTH = 300
const LABEL_CHARACTER_WIDTH = 6.6
const NODE_HORIZONTAL_PADDING = 42

export function getNodeDimensions(node) {
  return {
    w: Math.max(
      DEFAULT_NODE_WIDTH,
      Math.min(MAX_NODE_WIDTH, node.label.length * LABEL_CHARACTER_WIDTH + NODE_HORIZONTAL_PADDING),
    ),
    h: node.type === 'decision' ? DECISION_NODE_HEIGHT : DEFAULT_NODE_HEIGHT,
  }
}
