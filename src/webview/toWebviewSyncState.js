export function toWebviewSyncState(documentModel, viewState = {}, options = {}) {
  return {
    sourcePath: documentModel.sourcePath,
    graph: documentModel.graph,
    layout: documentModel.layout,
    layoutSpacing: viewState.layoutSpacing ?? documentModel.layoutSpacing ?? 100,
    edgeRenderMode: viewState.edgeRenderMode ?? documentModel.edgeRenderMode ?? 'straight',
    backgroundStyle: viewState.backgroundStyle ?? documentModel.backgroundStyle ?? 'paper',
    viewport: viewState.viewport ?? documentModel.viewport ?? null,
    documentError: documentModel.documentError ?? null,
    fitViewOnLoad: options.fitViewOnLoad ?? documentModel.fitViewOnLoad ?? false,
    fitViewRequestToken: options.fitViewRequestToken ?? documentModel.fitViewRequestToken ?? 0,
  }
}
