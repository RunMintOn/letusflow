export function toNodeHandlePositions(direction) {
  if (direction === 'TD' || direction === 'TB') {
    return {
      targetPosition: 'top',
      sourcePosition: 'bottom',
    }
  }

  return {
    targetPosition: 'left',
    sourcePosition: 'right',
  }
}
