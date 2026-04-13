const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const vscode = require('vscode')

function loadModule(relativePath) {
  return import(pathToFileURL(path.join(__dirname, relativePath)).href)
}

function createFsLike() {
  return {
    async readFile(targetPath) {
      return fs.readFile(targetPath, 'utf8')
    },
    async writeFile(targetPath, content) {
      await fs.writeFile(targetPath, content, 'utf8')
    },
  }
}

async function openPreview() {
  const editor = vscode.window.activeTextEditor
  const sourcePath = editor?.document?.uri?.scheme === 'file' ? editor.document.uri.fsPath : null

  if (!sourcePath || !sourcePath.endsWith('.flow')) {
    vscode.window.showErrorMessage('请先在编辑器中打开一个 .flow 文件。')
    return
  }

  const fsLike = createFsLike()
  const [{ loadDiagramDocument }, { renderGraphHtml }, { saveLayoutFile }] = await Promise.all([
    loadModule('./workspace/loadDiagramDocument.js'),
    loadModule('./webview/renderGraphHtml.js'),
    loadModule('./workspace/saveLayoutFile.js'),
  ])

  const documentModel = await loadDiagramDocument(fsLike, sourcePath)
  const panel = vscode.window.createWebviewPanel(
    'diagramEditor.preview',
    `Diagram: ${path.basename(sourcePath)}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true },
  )

  const rerender = async (nextModel = documentModel) => {
    panel.webview.html = renderGraphHtml(nextModel)
  }

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message?.type === 'moveNode') {
      const layout = documentModel.layout.nodes[message.nodeId]
      if (!layout) {
        return
      }
      layout.x = message.x
      layout.y = message.y
      await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
      return
    }

    if (message?.type === 'replaceLayout' && message.layout) {
      documentModel.layout = message.layout
      await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
      await rerender()
    }
  })

  await rerender()
}

function activate(context) {
  const disposable = vscode.commands.registerCommand('diagramEditor.openPreview', openPreview)
  context.subscriptions.push(disposable)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
