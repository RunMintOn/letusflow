export function createEmptyLayoutDocument() {
  return {
    version: 1,
    nodes: {},
    groups: {},
    edges: {},
  }
}

export function normalizeLayoutDocument(layout = {}) {
  return {
    version: 1,
    nodes: layout.nodes ?? {},
    groups: layout.groups ?? {},
    edges: layout.edges ?? {},
  }
}

export function createDefaultNodeLayout(partial = {}) {
  return {
    x: partial.x ?? 10,
    y: partial.y ?? 20,
    w: partial.w ?? 140,
    h: partial.h ?? 56,
  }
}

export function createDefaultGroupLayout(partial = {}) {
  return {
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    w: partial.w ?? 320,
    h: partial.h ?? 180,
  }
}

export function createDefaultEdgeLayout(partial = {}) {
  return {
    sourceSide: partial.sourceSide ?? 'right',
    targetSide: partial.targetSide ?? 'left',
  }
}
