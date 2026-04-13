import { buildWebviewDocumentPayload } from './buildWebviewDocumentPayload.js'

export function renderGraphHtml(documentModel) {
  const scriptUri = documentModel.webviewScriptUri ?? './dist/webview/webview-app.js'
  const styleUri = documentModel.webviewStyleUri ?? './dist/webview/webview-app.css'

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Diagram Preview</title>
    <link rel="stylesheet" href="${styleUri}" />
    <style>
      #boot-status {
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: 9999;
        max-width: 420px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255, 251, 240, 0.96);
        border: 1px solid rgba(43, 59, 47, 0.16);
        color: #2b3b2f;
        font: 12px/1.4 ui-monospace, monospace;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <div id="boot-status">boot: loading shell</div>
    <script>
      (function () {
        const bootStatus = document.getElementById('boot-status')
        const setBootStatus = (text) => {
          if (bootStatus) {
            bootStatus.textContent = text
          }
        }

        window.__setDiagramBootStatus = setBootStatus
        window.addEventListener('error', function (event) {
          setBootStatus('boot error: ' + (event.error?.stack || event.message || 'unknown'))
        })
        window.addEventListener('unhandledrejection', function (event) {
          const reason = event.reason
          setBootStatus('boot rejection: ' + (reason?.stack || reason?.message || String(reason)))
        })

        setBootStatus('boot: payload ready')
      })()

      window.__DIAGRAM_DOCUMENT__ = ${buildWebviewDocumentPayload(documentModel)}
    </script>
    <script>
      window.__setDiagramBootStatus?.('boot: loading bundle')
    </script>
    <script
      src="${scriptUri}"
      onload="window.__setDiagramBootStatus && window.__setDiagramBootStatus('boot: bundle loaded')"
      onerror="window.__setDiagramBootStatus && window.__setDiagramBootStatus('boot error: failed to load bundle')"
    ></script>
  </body>
</html>`
}
