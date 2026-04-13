function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function buildEdgePath(fromLayout, toLayout) {
  const fromX = fromLayout.x + fromLayout.w
  const fromY = fromLayout.y + fromLayout.h / 2
  const toX = toLayout.x
  const toY = toLayout.y + toLayout.h / 2
  const midX = Math.round((fromX + toX) / 2)
  return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
}

export function renderGraphHtml(documentModel) {
  const width = Math.max(
    800,
    ...Object.values(documentModel.layout.nodes).map((node) => node.x + node.w + 120),
  )
  const height = Math.max(
    500,
    ...Object.values(documentModel.layout.nodes).map((node) => node.y + node.h + 120),
  )

  const nodesJson = JSON.stringify(documentModel.graph.nodes)
  const edgesJson = JSON.stringify(documentModel.graph.edges)
  const layoutJson = JSON.stringify(documentModel.layout)
  const sourcePathJson = JSON.stringify(documentModel.sourcePath)

  const nodeMarkup = documentModel.graph.nodes
    .map((node) => {
      const layout = documentModel.layout.nodes[node.id]
      return `
        <g class="node" data-node-id="${escapeHtml(node.id)}" transform="translate(${layout.x}, ${layout.y})">
          <rect width="${layout.w}" height="${layout.h}" rx="14" ry="14"></rect>
          <text x="${layout.w / 2}" y="${layout.h / 2}" dominant-baseline="middle" text-anchor="middle">${escapeHtml(node.label)}</text>
        </g>
      `
    })
    .join('')

  const edgeMarkup = documentModel.graph.edges
    .map((edge) => {
      const from = documentModel.layout.nodes[edge.from]
      const to = documentModel.layout.nodes[edge.to]
      if (!from || !to) {
        return ''
      }

      return `
        <g class="edge">
          <path d="${buildEdgePath(from, to)}"></path>
          ${
            edge.label
              ? `<text x="${Math.round((from.x + to.x) / 2)}" y="${Math.round((from.y + to.y) / 2) - 12}">${escapeHtml(edge.label)}</text>`
              : ''
          }
        </g>
      `
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Diagram Preview</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: #fffdf7;
        --ink: #1f1f1a;
        --line: #4d5c47;
        --node: #fff9ea;
        --node-stroke: #2b3b2f;
      }

      body {
        margin: 0;
        font-family: ui-sans-serif, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, #fff7da 0, transparent 28%),
          linear-gradient(180deg, #f7f0dc 0%, var(--bg) 100%);
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(43, 59, 47, 0.15);
        background: rgba(255, 253, 247, 0.84);
        backdrop-filter: blur(6px);
      }

      .path {
        font-size: 12px;
        opacity: 0.72;
      }

      button {
        border: 1px solid rgba(43, 59, 47, 0.2);
        background: var(--panel);
        color: var(--ink);
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
      }

      svg {
        display: block;
        width: 100%;
        height: calc(100vh - 56px);
      }

      .edge path {
        stroke: var(--line);
        stroke-width: 2.5;
        fill: none;
      }

      .edge text {
        fill: var(--line);
        font-size: 12px;
      }

      .node {
        cursor: grab;
      }

      .node.dragging {
        cursor: grabbing;
      }

      .node rect {
        fill: var(--node);
        stroke: var(--node-stroke);
        stroke-width: 2;
      }

      .node text {
        fill: var(--ink);
        font-size: 14px;
        font-weight: 600;
        user-select: none;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="path">${escapeHtml(documentModel.sourcePath)}</div>
      <button id="reload-layout" type="button">重排视图</button>
    </header>
    <svg id="diagram-canvas" viewBox="0 0 ${width} ${height}">
      ${edgeMarkup}
      ${nodeMarkup}
    </svg>
    <script>
      window.__DIAGRAM_DOCUMENT__ = {
        sourcePath: ${sourcePathJson},
        graph: {
          nodes: ${nodesJson},
          edges: ${edgesJson},
        },
        layout: ${layoutJson},
      }
    </script>
    <script>
      const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null
      const doc = window.__DIAGRAM_DOCUMENT__
      const svg = document.getElementById('diagram-canvas')
      const reloadButton = document.getElementById('reload-layout')
      let active = null

      function edgePath(fromLayout, toLayout) {
        const fromX = fromLayout.x + fromLayout.w
        const fromY = fromLayout.y + fromLayout.h / 2
        const toX = toLayout.x
        const toY = toLayout.y + toLayout.h / 2
        const midX = Math.round((fromX + toX) / 2)
        return 'M ' + fromX + ' ' + fromY + ' L ' + midX + ' ' + fromY + ' L ' + midX + ' ' + toY + ' L ' + toX + ' ' + toY
      }

      function render() {
        const edgeLayer = doc.graph.edges.map((edge) => {
          const from = doc.layout.nodes[edge.from]
          const to = doc.layout.nodes[edge.to]
          if (!from || !to) {
            return ''
          }
          const label = edge.label
            ? '<text x="' + Math.round((from.x + to.x) / 2) + '" y="' + (Math.round((from.y + to.y) / 2) - 12) + '">' + edge.label + '</text>'
            : ''
          return '<g class="edge"><path d="' + edgePath(from, to) + '"></path>' + label + '</g>'
        }).join('')

        const nodeLayer = doc.graph.nodes.map((node) => {
          const layout = doc.layout.nodes[node.id]
          return '<g class="node" data-node-id="' + node.id + '" transform="translate(' + layout.x + ', ' + layout.y + ')">' +
            '<rect width="' + layout.w + '" height="' + layout.h + '" rx="14" ry="14"></rect>' +
            '<text x="' + (layout.w / 2) + '" y="' + (layout.h / 2) + '" dominant-baseline="middle" text-anchor="middle">' + node.label + '</text>' +
            '</g>'
        }).join('')

        svg.innerHTML = edgeLayer + nodeLayer
      }

      function svgPoint(event) {
        const point = svg.createSVGPoint()
        point.x = event.clientX
        point.y = event.clientY
        return point.matrixTransform(svg.getScreenCTM().inverse())
      }

      svg.addEventListener('pointerdown', (event) => {
        const target = event.target.closest('.node')
        if (!target) {
          return
        }

        const nodeId = target.dataset.nodeId
        const layout = doc.layout.nodes[nodeId]
        const point = svgPoint(event)
        active = {
          nodeId,
          offsetX: point.x - layout.x,
          offsetY: point.y - layout.y,
        }
        target.classList.add('dragging')
        target.setPointerCapture(event.pointerId)
      })

      svg.addEventListener('pointermove', (event) => {
        if (!active) {
          return
        }

        const point = svgPoint(event)
        const layout = doc.layout.nodes[active.nodeId]
        layout.x = Math.max(24, Math.round(point.x - active.offsetX))
        layout.y = Math.max(24, Math.round(point.y - active.offsetY))
        render()
      })

      svg.addEventListener('pointerup', (event) => {
        const target = event.target.closest('.node')
        if (target) {
          target.classList.remove('dragging')
        }
        if (!active) {
          return
        }

        const layout = doc.layout.nodes[active.nodeId]
        if (vscode) {
          vscode.postMessage({
            type: 'moveNode',
            nodeId: active.nodeId,
            x: layout.x,
            y: layout.y,
          })
        }
        active = null
      })

      reloadButton.addEventListener('click', () => {
        const ids = doc.graph.nodes.map((node) => node.id)
        let x = 80
        for (const id of ids) {
          const layout = doc.layout.nodes[id]
          layout.x = x
          layout.y = 120
          x += 220
        }
        render()
        if (vscode) {
          vscode.postMessage({
            type: 'replaceLayout',
            layout: doc.layout,
          })
        }
      })

      render()
    </script>
  </body>
</html>`
}
