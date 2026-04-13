export function edgeMatchesRef(edge, edgeRef) {
  return edge.from === edgeRef.from
    && edge.to === edgeRef.to
    && (edge.label ?? '') === (edgeRef.label ?? '')
    && (edge.style ?? '') === (edgeRef.style ?? '')
}
