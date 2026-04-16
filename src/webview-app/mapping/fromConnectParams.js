export function fromConnectParams(connection) {
  return {
    from: connection.source,
    to: connection.target,
    label: undefined,
    sourceSide: toSide(connection.sourceHandle, 'right'),
    targetSide: toSide(connection.targetHandle, 'left'),
  }
}

function toSide(handleId, fallback) {
  if (typeof handleId !== 'string' || !handleId) {
    return fallback
  }

  return handleId.split('-')[0] || fallback
}
