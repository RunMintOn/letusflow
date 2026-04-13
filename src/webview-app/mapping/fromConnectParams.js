export function fromConnectParams(connection) {
  return {
    from: connection.source,
    to: connection.target,
    label: undefined,
  }
}
