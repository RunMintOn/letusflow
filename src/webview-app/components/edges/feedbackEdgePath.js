export function toFeedbackEdgePath({ sourceX, sourceY, targetX, targetY, route }) {
  if (route?.direction === 'TD' || route?.direction === 'TB') {
    const sourceExitY = sourceY + route.sourceOffset
    const targetEnterY = targetY - route.targetOffset
    return [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${sourceExitY}`,
      `L ${route.laneX} ${sourceExitY}`,
      `L ${route.laneX} ${targetEnterY}`,
      `L ${targetX} ${targetEnterY}`,
      `L ${targetX} ${targetY}`,
    ].join(' ')
  }

  const sourceExitX = sourceX + route.sourceOffset
  const targetEnterX = targetX - route.targetOffset
  return [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceExitX} ${sourceY}`,
    `L ${sourceExitX} ${route.laneY}`,
    `L ${targetEnterX} ${route.laneY}`,
    `L ${targetEnterX} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ')
}
