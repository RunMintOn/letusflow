export function createWebviewDocumentModel(webview, documentModel, extensionUri, joinPath) {
  const scriptUri = webview.asWebviewUri(
    joinPath(extensionUri, 'dist', 'webview', 'webview-app.js'),
  )
  const styleUri = webview.asWebviewUri(
    joinPath(extensionUri, 'dist', 'webview', 'webview-app.css'),
  )

  return {
    ...documentModel,
    webviewScriptUri: scriptUri.toString(),
    webviewStyleUri: styleUri.toString(),
  }
}
