import * as vscode from 'vscode'

function createTextDocumentFsLike(document) {
  return {
    async readFile() {
      return document.getText()
    },
    async writeFile(_targetPath, _content) {
      throw new Error('writeFile is not implemented yet for Custom Editor sessions')
    },
  }
}

export async function resolveCustomFlowEditor({
  document,
  webviewPanel,
  extensionContext,
  outputChannel,
  loadModule,
  normalizeBackgroundStyle,
  toBackgroundStyleStorageKey,
}) {
  webviewPanel.webview.options = {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', 'webview')],
  }
  webviewPanel.title = document.uri.path.split('/').pop() ?? 'Flow Diagram'

  const [
    { createWebviewDocumentModel },
    { loadDiagramDocumentFromSource },
    { renderGraphHtml },
  ] = await Promise.all([
    loadModule('./extension-helpers/createWebviewDocumentModel.js'),
    loadModule('./workspace/loadDiagramDocument.js'),
    loadModule('./webview/renderGraphHtml.js'),
  ])

  const fsLike = createTextDocumentFsLike(document)
  let documentModel = await loadDiagramDocumentFromSource(document.uri.fsPath, await fsLike.readFile())
  let layoutSpacing = 100
  let edgeRenderMode = 'straight'
  let backgroundStyle = normalizeBackgroundStyle(
    extensionContext.workspaceState.get(toBackgroundStyleStorageKey(document.uri.fsPath)),
  )
  let viewport = null
  let fitViewRequestToken = 0

  outputChannel.appendLine(`[resolveCustomFlowEditor] opened ${document.uri.fsPath}`)

  const rerender = async (nextModel = documentModel, options = {}) => {
    webviewPanel.webview.html = renderGraphHtml(
      createWebviewDocumentModel(
        webviewPanel.webview,
        {
          ...nextModel,
          layoutSpacing,
          edgeRenderMode,
          backgroundStyle,
          viewport,
          fitViewOnLoad: options.fitViewOnLoad ?? false,
          fitViewRequestToken,
        },
        extensionContext.extensionUri,
        vscode.Uri.joinPath,
      ),
    )
  }

  fitViewRequestToken += 1
  await rerender(documentModel, { fitViewOnLoad: true })
}
