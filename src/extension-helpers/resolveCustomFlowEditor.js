import * as vscode from 'vscode'

function createTextDocumentFsLike(document) {
  return {
    async readFile() {
      return document.getText()
    },
    async writeFile(targetPath, content) {
      const encoder = new TextEncoder()
      await vscode.workspace.fs.writeFile(vscode.Uri.file(targetPath), encoder.encode(content))
    },
  }
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
    await saveDiagramSource(fsLike, sourcePath, sourceText)
    return 'fsWrite'
  }
}

function normalizeLayoutSpacing(value) {
  const spacing = Number(value)
  if (!Number.isFinite(spacing)) {
    return 100
  }

  return Math.max(30, Math.min(150, spacing))
}

function normalizeViewport(value) {
  const x = Number(value?.x)
  const y = Number(value?.y)
  const zoom = Number(value?.zoom)

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
  }
}

function postHostDebug(webviewPanel, text) {
  webviewPanel.webview.postMessage({
    type: 'hostDebug',
    text,
  })
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
    { renameNodeLabel },
    { serializeDiagram },
    { loadDiagramDocumentFromSource },
    { renderGraphHtml },
    { saveDiagramSource },
    { autoLayoutGraph },
    { createNode },
    { createEdge },
    { generateNodeId },
    { deleteNode },
    { deleteEdge },
    { renameEdgeLabel },
    { createSuccessorNode },
  ] = await Promise.all([
    loadModule('./extension-helpers/createWebviewDocumentModel.js'),
    loadModule('./model/renameNodeLabel.js'),
    loadModule('./model/serializeDiagram.js'),
    loadModule('./workspace/loadDiagramDocument.js'),
    loadModule('./webview/renderGraphHtml.js'),
    loadModule('./workspace/saveDiagramSource.js'),
    loadModule('./model/layout.js'),
    loadModule('./model/createNode.js'),
    loadModule('./model/createEdge.js'),
    loadModule('./model/generateNodeId.js'),
    loadModule('./model/deleteNode.js'),
    loadModule('./model/deleteEdge.js'),
    loadModule('./model/renameEdgeLabel.js'),
    loadModule('./model/createSuccessorNode.js'),
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
  let refreshTimer = null
  let isApplyingHostEdit = false

  outputChannel.appendLine(`[resolveCustomFlowEditor] opened ${document.uri.fsPath}`)

  const autoLayoutCurrentGraph = () => autoLayoutGraph(documentModel.graph, { spacing: layoutSpacing })

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

  const persistGraph = async () => {
    documentModel.sourceText = serializeDiagram(documentModel.graph)
    isApplyingHostEdit = true
    try {
      return await persistSourceText(
        document.uri.fsPath,
        documentModel.sourceText,
        fsLike,
        saveDiagramSource,
      )
    } finally {
      setTimeout(() => {
        isApplyingHostEdit = false
      }, 0)
    }
  }

  const refreshFromDocument = async () => {
    try {
      documentModel = await loadDiagramDocumentFromSource(document.uri.fsPath, document.getText())
      await rerender(documentModel)
    } catch (error) {
      outputChannel.appendLine(`[document-refresh] failed: ${error?.stack ?? error}`)
    }
  }

  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (!(event.document.uri.toString() === document.uri.toString())) {
      return
    }
    if (isApplyingHostEdit) {
      return
    }

    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      void refreshFromDocument()
    }, 120)
  })

  const messageDisposable = webviewPanel.webview.onDidReceiveMessage(async (message) => {
    outputChannel.appendLine(`[webview->host] ${JSON.stringify(message)}`)

    try {
      if (message?.type === 'webviewReady') {
        postHostDebug(webviewPanel, `webviewReady acquire=${message.acquireType} post=${message.postMessageType}`)
        return
      }

      if (message?.type === 'renameNode' && message.nodeId && typeof message.label === 'string') {
        const nextLabel = message.label.trim()
        if (!nextLabel) {
          postHostDebug(webviewPanel, 'renameNode ignored: empty label')
          return
        }

        documentModel.graph = renameNodeLabel(documentModel.graph, message.nodeId, nextLabel)
        const mode = await persistGraph()
        outputChannel.appendLine(`[renameNode] persisted via ${mode}`)
        postHostDebug(webviewPanel, `renameNode saved via ${mode}: ${message.nodeId} -> ${nextLabel}`)
        await rerender()
        return
      }

      if (message?.type === 'createNode') {
        const label = typeof message.label === 'string' && message.label.trim()
          ? message.label.trim()
          : '新节点'
        const nodeId = generateNodeId(documentModel.graph.nodes, 'node')

        documentModel.graph = createNode(documentModel.graph, { id: nodeId, label })
        documentModel.layout = autoLayoutCurrentGraph()

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `createNode saved via ${mode}: ${nodeId}`)
        await rerender()
        return
      }

      if (message?.type === 'createSuccessorNode' && message.nodeId) {
        if (!documentModel.graph.nodes.some((node) => node.id === message.nodeId)) {
          postHostDebug(webviewPanel, `createSuccessorNode ignored: missing node ${message.nodeId}`)
          return
        }

        const label = typeof message.label === 'string' && message.label.trim()
          ? message.label.trim()
          : '新节点'
        const nodeId = generateNodeId(documentModel.graph.nodes, 'node')

        documentModel.graph = createSuccessorNode(documentModel.graph, message.nodeId, { id: nodeId, label })
        documentModel.layout = autoLayoutCurrentGraph()

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `createSuccessorNode saved via ${mode}: ${message.nodeId} -> ${nodeId}`)
        await rerender()
        return
      }

      if (message?.type === 'autoLayout') {
        documentModel.layout = autoLayoutCurrentGraph()
        postHostDebug(webviewPanel, 'autoLayout applied')
        fitViewRequestToken += 1
        await rerender(documentModel, { fitViewOnLoad: true })
        return
      }

      if (message?.type === 'setSpacing') {
        layoutSpacing = normalizeLayoutSpacing(message.value)
        postHostDebug(webviewPanel, `setSpacing applied: ${layoutSpacing}`)
        return
      }

      if (message?.type === 'setEdgeRenderMode') {
        edgeRenderMode = message.value === 'default' ? 'default' : 'straight'
        postHostDebug(webviewPanel, `setEdgeRenderMode applied: ${edgeRenderMode}`)
        return
      }

      if (message?.type === 'setBackgroundStyle') {
        backgroundStyle = normalizeBackgroundStyle(message.value)
        await extensionContext.workspaceState.update(
          toBackgroundStyleStorageKey(documentModel.sourcePath),
          backgroundStyle,
        )
        postHostDebug(webviewPanel, `setBackgroundStyle applied: ${backgroundStyle}`)
        await rerender()
        return
      }

      if (message?.type === 'setViewport') {
        if (!message.viewport) {
          return
        }

        viewport = normalizeViewport(message.viewport)
        postHostDebug(webviewPanel, `setViewport applied: ${viewport.x},${viewport.y},${viewport.zoom}`)
        return
      }

      if (message?.type === 'deleteNode' && message.nodeId) {
        documentModel.graph = deleteNode(documentModel.graph, message.nodeId)
        documentModel.layout = autoLayoutCurrentGraph()

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `deleteNode saved via ${mode}: ${message.nodeId}`)
        await rerender()
        return
      }

      if (message?.type === 'deleteEdge' && message.edge) {
        documentModel.graph = deleteEdge(documentModel.graph, message.edge)
        documentModel.layout = autoLayoutCurrentGraph()

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `deleteEdge saved via ${mode}: ${message.edge.from} -> ${message.edge.to}`)
        await rerender()
        return
      }

      if (message?.type === 'renameEdgeLabel' && message.edge) {
        const nextLabel = typeof message.label === 'string' ? message.label.trim() : ''
        const matchingNextLabelCount = documentModel.graph.edges.filter((edge) =>
          edge.from === message.edge.from
          && edge.to === message.edge.to
          && (edge.label ?? '') === nextLabel
          && (edge.style ?? '') === (message.edge.style ?? '')
        ).length
        const keepsCurrentLabel = (message.edge.label ?? '') === nextLabel
        const duplicate = keepsCurrentLabel ? matchingNextLabelCount > 1 : matchingNextLabelCount > 0
        if (duplicate) {
          postHostDebug(webviewPanel, `renameEdgeLabel ignored: duplicate ${message.edge.from} -> ${message.edge.to}`)
          return
        }

        documentModel.graph = renameEdgeLabel(documentModel.graph, message.edge, nextLabel)
        const mode = await persistGraph()
        postHostDebug(webviewPanel, `renameEdgeLabel saved via ${mode}: ${message.edge.from} -> ${message.edge.to}`)
        await rerender()
        return
      }

      if (message?.type === 'createEdge' && message.edge) {
        const from = message.edge.from
        const to = message.edge.to
        const label = typeof message.edge.label === 'string' ? message.edge.label.trim() : undefined

        if (!from || !to) {
          postHostDebug(webviewPanel, 'createEdge ignored: missing endpoints')
          return
        }

        const hasDuplicate = documentModel.graph.edges.some(
          (edge) => edge.from === from && edge.to === to && (edge.label ?? '') === (label ?? ''),
        )
        if (hasDuplicate) {
          postHostDebug(webviewPanel, `createEdge ignored: duplicate ${from} -> ${to}`)
          return
        }

        documentModel.graph = createEdge(documentModel.graph, { from, to, label })
        documentModel.layout = autoLayoutCurrentGraph()
        const mode = await persistGraph()
        postHostDebug(webviewPanel, `createEdge saved via ${mode}: ${from} -> ${to}`)
        await rerender()
      }
    } catch (error) {
      outputChannel.appendLine(`[message-handler] failed: ${error?.stack ?? error}`)
      postHostDebug(webviewPanel, `handler failed: ${error?.message ?? String(error)}`)
    }
  })

  webviewPanel.onDidDispose(() => {
    clearTimeout(refreshTimer)
    documentChangeDisposable.dispose()
    messageDisposable.dispose()
  })

  fitViewRequestToken += 1
  await rerender(documentModel, { fitViewOnLoad: true })
  postHostDebug(webviewPanel, 'host ready')
}
