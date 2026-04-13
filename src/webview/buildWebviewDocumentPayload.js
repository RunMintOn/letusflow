export function buildWebviewDocumentPayload(documentModel) {
  return JSON.stringify({
    sourcePath: documentModel.sourcePath,
    layoutPath: documentModel.layoutPath,
    graph: documentModel.graph,
    layout: documentModel.layout,
  })
}
