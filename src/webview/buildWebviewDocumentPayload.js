export function buildWebviewDocumentPayload(documentModel) {
  return JSON.stringify({
    sourcePath: documentModel.sourcePath,
    graph: documentModel.graph,
    layout: documentModel.layout,
    layoutSpacing: documentModel.layoutSpacing,
    edgeRenderMode: documentModel.edgeRenderMode,
    backgroundStyle: documentModel.backgroundStyle,
    viewport: documentModel.viewport,
    fitViewOnLoad: documentModel.fitViewOnLoad,
    fitViewRequestToken: documentModel.fitViewRequestToken,
  })
}
