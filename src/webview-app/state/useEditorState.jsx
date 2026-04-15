import React from 'react'

import { toFlowNodes } from '../mapping/toFlowNodes.js'
import { toFlowEdges } from '../mapping/toFlowEdges.js'
import { toEditorLayout } from './toEditorLayout.js'

export function useEditorState(
  initialDocument,
  layoutSpacing,
  isSpacingPreviewActive = false,
) {
  const [documentModel, setDocumentModel] = React.useState(initialDocument)
  const activeLayout = React.useMemo(
    () => toEditorLayout(documentModel, layoutSpacing, isSpacingPreviewActive),
    [documentModel, isSpacingPreviewActive, layoutSpacing],
  )

  const flowNodes = React.useMemo(
    () => toFlowNodes(documentModel.graph, activeLayout),
    [activeLayout, documentModel.graph],
  )

  const flowEdges = React.useMemo(
    () => toFlowEdges(
      documentModel.graph.edges,
      documentModel.graph.nodes,
      activeLayout,
    ),
    [activeLayout, documentModel.graph.edges, documentModel.graph.nodes],
  )

  return {
    documentModel,
    setDocumentModel,
    flowNodes,
    flowEdges,
  }
}
