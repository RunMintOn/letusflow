export function resetFlowLayout({ setNodes, setEdges, flowNodes, flowEdges, postToHost }) {
  setNodes(flowNodes)
  setEdges(flowEdges)
  postToHost({ type: 'autoLayout' })
}
