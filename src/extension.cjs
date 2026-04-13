const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const vscode = require('vscode')

const outputChannel = vscode.window.createOutputChannel('Diagram Editor MVP')
let extensionContext = null

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
  if (!extensionContext) {
    throw new Error('extension context is not available')
  }

  const editor = vscode.window.activeTextEditor
  const sourcePath = editor?.document?.uri?.scheme === 'file' ? editor.document.uri.fsPath : null

  outputChannel.appendLine(`[openPreview] active path: ${sourcePath ?? 'none'}`)

  if (!sourcePath || !sourcePath.endsWith('.flow')) {
    vscode.window.showErrorMessage('请先在编辑器中打开一个 .flow 文件。')
    return
  }

  const fsLike = createFsLike()
  const [
    { createWebviewDocumentModel },
    { renameNodeLabel },
    { serializeDiagram },
    { loadDiagramDocument },
    { renderGraphHtml },
    { saveDiagramSource },
    { saveLayoutFile },
    { applyMovedNodes, autoLayoutGraph, createLayoutForNode },
    { createNode },
    { createEdge },
    { generateNodeId },
  ] = await Promise.all([
    loadModule('./extension-helpers/createWebviewDocumentModel.js'),
    loadModule('./model/renameNodeLabel.js'),
    loadModule('./model/serializeDiagram.js'),
    loadModule('./workspace/loadDiagramDocument.js'),
    loadModule('./webview/renderGraphHtml.js'),
    loadModule('./workspace/saveDiagramSource.js'),
    loadModule('./workspace/saveLayoutFile.js'),
    loadModule('./model/layout.js'),
    loadModule('./model/createNode.js'),
    loadModule('./model/createEdge.js'),
    loadModule('./model/generateNodeId.js'),
  ])

  const documentModel = await loadDiagramDocument(fsLike, sourcePath)
  const panel = vscode.window.createWebviewPanel(
    'diagramEditor.preview',
    `Diagram: ${path.basename(sourcePath)}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionContext.extensionUri, 'dist', 'webview')],
    },
  )

  const rerender = async (nextModel = documentModel) => {
    panel.webview.html = renderGraphHtml(
      createWebviewDocumentModel(
        panel.webview,
        nextModel,
        extensionContext.extensionUri,
        vscode.Uri.joinPath,
      ),
    )
  }

  const persistGraph = async () => {
    documentModel.sourceText = serializeDiagram(documentModel.graph)
    return persistSourceText(documentModel.sourcePath, documentModel.sourceText, fsLike, saveDiagramSource)
  }

  panel.webview.onDidReceiveMessage(async (message) => {
    outputChannel.appendLine(`[webview->host] ${JSON.stringify(message)}`)

    try {
      if (message?.type === 'webviewReady') {
        postHostDebug(panel, `webviewReady acquire=${message.acquireType} post=${message.postMessageType}`)
        return
      }

      if (message?.type === 'moveNode') {
        const layout = documentModel.layout.nodes[message.nodeId]
        if (!layout) {
          postHostDebug(panel, 'moveNode: missing layout for node')
          return
        }
        layout.x = message.x
        layout.y = message.y
        await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
        postHostDebug(panel, `moveNode saved: ${message.nodeId} -> (${message.x}, ${message.y})`)
        return
      }

      if (message?.type === 'moveNodes' && Array.isArray(message.nodes)) {
        documentModel.layout = applyMovedNodes(documentModel.layout, message.nodes)
        await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
        postHostDebug(panel, `moveNodes saved: ${message.nodes.length}`)
        return
      }

      if (message?.type === 'replaceLayout' && message.layout) {
        documentModel.layout = message.layout
        await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
        postHostDebug(panel, 'replaceLayout saved')
        await rerender()
        return
      }

      if (message?.type === 'renameNode' && message.nodeId && typeof message.label === 'string') {
        const nextLabel = message.label.trim()
        if (!nextLabel) {
          postHostDebug(panel, 'renameNode ignored: empty label')
          return
        }

        documentModel.graph = renameNodeLabel(documentModel.graph, message.nodeId, nextLabel)
        const mode = await persistGraph()
        outputChannel.appendLine(`[renameNode] persisted via ${mode}`)
        postHostDebug(panel, `renameNode saved via ${mode}: ${message.nodeId} -> ${nextLabel}`)
        await rerender()
        return
      }

      if (message?.type === 'createNode') {
        const label = typeof message.label === 'string' && message.label.trim()
          ? message.label.trim()
          : '新节点'
        const nodeId = generateNodeId(documentModel.graph.nodes, 'node')

        documentModel.graph = createNode(documentModel.graph, { id: nodeId, label })
        documentModel.layout = createLayoutForNode(documentModel.layout, nodeId)

        await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
        const mode = await persistGraph()
        postHostDebug(panel, `createNode saved via ${mode}: ${nodeId}`)
        await rerender()
        return
      }

      if (message?.type === 'autoLayout') {
        documentModel.layout = autoLayoutGraph(documentModel.graph)
        await saveLayoutFile(fsLike, documentModel.layoutPath, documentModel.layout)
        postHostDebug(panel, 'autoLayout saved')
        await rerender()
        return
      }

      if (message?.type === 'createEdge' && message.edge) {
        const from = message.edge.from
        const to = message.edge.to
        const label = typeof message.edge.label === 'string' ? message.edge.label.trim() : undefined

        if (!from || !to) {
          postHostDebug(panel, 'createEdge ignored: missing endpoints')
          return
        }

        const hasDuplicate = documentModel.graph.edges.some(
          (edge) => edge.from === from && edge.to === to && (edge.label ?? '') === (label ?? ''),
        )
        if (hasDuplicate) {
          postHostDebug(panel, `createEdge ignored: duplicate ${from} -> ${to}`)
          return
        }

        documentModel.graph = createEdge(documentModel.graph, { from, to, label })
        const mode = await persistGraph()
        postHostDebug(panel, `createEdge saved via ${mode}: ${from} -> ${to}`)
        await rerender()
      }
    } catch (error) {
      outputChannel.appendLine(`[message-handler] failed: ${error?.stack ?? error}`)
      postHostDebug(panel, `handler failed: ${error?.message ?? String(error)}`)
    }
  })

  await rerender()
  postHostDebug(panel, 'host ready')
}

function activate(context) {
  extensionContext = context
  const disposable = vscode.commands.registerCommand('diagramEditor.openPreview', openPreview)
  context.subscriptions.push(disposable)
}

async function persistSourceText(sourcePath, sourceText, fsLike, saveDiagramSource) {
  const uri = vscode.Uri.file(sourcePath)

  try {
    const document = await vscode.workspace.openTextDocument(uri)
    const edit = new vscode.WorkspaceEdit()
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    )
    edit.replace(uri, fullRange, sourceText)
    const applied = await vscode.workspace.applyEdit(edit)
    if (!applied) {
      throw new Error('applyEdit failed')
    }
    await document.save()
    return 'workspaceEdit'
  } catch (error) {
    outputChannel.appendLine(`[persistSourceText] workspace edit failed, fallback to fs write: ${error?.message ?? String(error)}`)
    await saveDiagramSource(fsLike, sourcePath, sourceText)
    return 'fsWrite'
  }
}

function postHostDebug(panel, text) {
  panel.webview.postMessage({
    type: 'hostDebug',
    text,
  })
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
