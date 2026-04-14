import { autoLayoutGraph } from '../../model/layout.js'

export function toEditorLayout(documentModel, layoutSpacing, isSpacingPreviewActive = false) {
  if (layoutSpacing === undefined || !isSpacingPreviewActive) {
    return documentModel.layout
  }

  return autoLayoutGraph(documentModel.graph, { spacing: layoutSpacing })
}
