import React from 'react'

import { toFlowNodes } from '../mapping/toFlowNodes.js'
import { toFlowEdges } from '../mapping/toFlowEdges.js'

export function useEditorState(initialDocument) {
  const [documentModel, setDocumentModel] = React.useState(initialDocument)

  const flowNodes = React.useMemo(
    () => toFlowNodes(documentModel.graph, documentModel.layout),
    [documentModel],
  )

  const flowEdges = React.useMemo(
    () => toFlowEdges(documentModel.graph.edges),
    [documentModel],
  )

  return {
    documentModel,
    setDocumentModel,
    flowNodes,
    flowEdges,
  }
}
