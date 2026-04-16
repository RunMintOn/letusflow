import { autoLayoutGraph } from '../../model/layout.js'
import { reconcileLayout } from '../../model/reconcileLayout.js'

export function toEditorLayout(documentModel, layoutSpacing, isSpacingPreviewActive = false) {
  if (layoutSpacing === undefined || !isSpacingPreviewActive) {
    return documentModel.layout
  }

  return reconcileLayout(
    documentModel.graph,
    autoLayoutGraph(documentModel.graph, { spacing: layoutSpacing }),
  )
}
