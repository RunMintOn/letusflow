import React from 'react'

import { toEditorLayout } from './toEditorLayout.js'
import { toFlowCollections } from './toFlowCollections.js'

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

  const { flowNodes, flowEdges } = React.useMemo(
    () => toFlowCollections(documentModel, activeLayout),
    [activeLayout, documentModel],
  )

  const activeViewModel = React.useMemo(
    () => documentModel.routeC?.enabled ? documentModel.routeC.viewModel ?? null : null,
    [documentModel.routeC],
  )

  return {
    documentModel,
    setDocumentModel,
    activeViewModel,
    flowNodes,
    flowEdges,
  }
}
