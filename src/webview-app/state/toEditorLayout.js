import { autoLayoutGraph } from '../../model/layout.js'

export function toEditorLayout(documentModel, layoutSpacing) {
  if (layoutSpacing === undefined) {
    return documentModel.layout
  }

  return autoLayoutGraph(documentModel.graph, { spacing: layoutSpacing })
}
