const BASE_GAP = 20
const DOT_RADIUS = 0.5

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

export function toObsidianDotGridPattern(viewport) {
  const zoom = Number.isFinite(viewport?.zoom) && viewport.zoom > 0 ? viewport.zoom : 1
  const gap = BASE_GAP * zoom
  const x = Number.isFinite(viewport?.x) ? viewport.x : 0
  const y = Number.isFinite(viewport?.y) ? viewport.y : 0

  return {
    gap,
    offsetX: mod(x, gap),
    offsetY: mod(y, gap),
    radius: DOT_RADIUS,
  }
}
