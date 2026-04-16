import * as vscode from 'vscode'

function createTextDocumentFsLike(document) {
  const decoder = new TextDecoder()
  const documentPath = document.uri.fsPath

  return {
    async readFile(targetPath = documentPath) {
      if (targetPath === documentPath) {
        return document.getText()
      }

      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(targetPath))
      return decoder.decode(bytes)
    },
    async writeFile(targetPath, content) {
      const encoder = new TextEncoder()
      await vscode.workspace.fs.writeFile(vscode.Uri.file(targetPath), encoder.encode(content))
    },
  }
}

async function persistLayoutDocument(layoutPath, layoutDocument, fsLike, saveLayoutDocument) {
  await saveLayoutDocument(fsLike, layoutPath, layoutDocument)
  return 'fsWrite'
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
    if (applied) {
      await document.save()
      return 'workspaceEdit'
    }

    await saveDiagramSource(fsLike, sourcePath, sourceText)
    return 'fsWrite'
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

function createEmptyDocumentModel(sourcePath, sourceText = '') {
  return {
    sourcePath,
    sourceText,
    layoutPath: `${sourcePath}.layout.json`,
    graph: {
      direction: 'LR',
      groups: [],
      nodes: [],
      edges: [],
    },
    layout: {
      version: 1,
      nodes: {},
      groups: {},
      edges: {},
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
    { createDefaultGroupLayout },
    { renameNodeLabel },
    { shiftGroupWithChildren },
    { reconcileLayout },
    { serializeDiagram },
    { loadDiagramDocument, loadDiagramDocumentFromSource },
    { renderGraphHtml },
    { saveDiagramSource },
    { saveLayoutDocument },
    { autoLayoutGraph },
    { createNode },
    { createGroup },
    { createEdge },
    { generateNodeId },
    { deleteNode },
    { deleteGroup },
    { deleteEdge },
    { moveNodeToGroup },
    { renameGroupLabel },
    { renameEdgeLabel },
    { createSuccessorNode },
    { placeSuccessorNode },
    { toWebviewSyncState },
  ] = await Promise.all([
    loadModule('./extension-helpers/createWebviewDocumentModel.js'),
    loadModule('./model/layoutSchema.js'),
    loadModule('./model/renameNodeLabel.js'),
    loadModule('./model/groupLayout.js'),
    loadModule('./model/reconcileLayout.js'),
    loadModule('./model/serializeDiagram.js'),
    loadModule('./workspace/loadDiagramDocument.js'),
    loadModule('./webview/renderGraphHtml.js'),
    loadModule('./workspace/saveDiagramSource.js'),
    loadModule('./workspace/saveLayoutDocument.js'),
    loadModule('./model/layout.js'),
    loadModule('./model/createNode.js'),
    loadModule('./model/createGroup.js'),
    loadModule('./model/createEdge.js'),
    loadModule('./model/generateNodeId.js'),
    loadModule('./model/deleteNode.js'),
    loadModule('./model/deleteGroup.js'),
    loadModule('./model/deleteEdge.js'),
    loadModule('./model/moveNodeToGroup.js'),
    loadModule('./model/renameGroupLabel.js'),
    loadModule('./model/renameEdgeLabel.js'),
    loadModule('./model/createSuccessorNode.js'),
    loadModule('./model/placeSuccessorNode.js'),
    loadModule('./webview/toWebviewSyncState.js'),
  ])

  const fsLike = createTextDocumentFsLike(document)
  const initialSourceText = await fsLike.readFile()
  let documentModel
  let initialDocumentError = null

  try {
    documentModel = await loadDiagramDocument(fsLike, document.uri.fsPath)
  } catch (error) {
    initialDocumentError = error?.message ?? String(error)
    documentModel = createEmptyDocumentModel(document.uri.fsPath, initialSourceText)
  }

  let lastValidDocumentModel = documentModel
  let layoutSpacing = 100
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

  const postSyncState = async (nextModel = documentModel, options = {}) => {
    const payload = toWebviewSyncState(
      nextModel,
      {
        layoutSpacing,
        backgroundStyle,
        viewport,
      },
      {
        fitViewOnLoad: options.fitViewOnLoad ?? false,
        fitViewRequestToken: options.fitViewRequestToken ?? fitViewRequestToken,
      },
    )

    await webviewPanel.webview.postMessage({
      type: 'syncState',
      payload,
    })
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

  const persistLayout = async () => persistLayoutDocument(
    documentModel.layoutPath,
    documentModel.layout,
    fsLike,
    saveLayoutDocument,
  )

  const refreshFromDocument = async () => {
    try {
      documentModel = await loadDiagramDocument(fsLike, document.uri.fsPath)
      lastValidDocumentModel = documentModel
      await rerender({
        ...documentModel,
        documentError: null,
      })
    } catch (error) {
      const documentError = error?.message ?? String(error)
      outputChannel.appendLine(`[document-refresh] failed: ${error?.stack ?? error}`)
      await rerender({
        ...lastValidDocumentModel,
        documentError,
      })
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
        await postSyncState()
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
        await postSyncState()
        return
      }

      if (message?.type === 'createGroup' && message.group) {
        documentModel.graph = createGroup(documentModel.graph, message.group)
        documentModel.layout = {
          ...documentModel.layout,
          groups: {
            ...(documentModel.layout.groups ?? {}),
            [message.group.id]: createDefaultGroupLayout(message.layout),
          },
        }

        const mode = await persistGraph()
        await persistLayout()
        postHostDebug(webviewPanel, `createGroup saved via ${mode}: ${message.group.id}`)
        await postSyncState()
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
        const newNode = { id: nodeId, label }

        documentModel.graph = createSuccessorNode(documentModel.graph, message.nodeId, newNode)
        const nextPlacement = placeSuccessorNode(
          documentModel.graph,
          documentModel.layout,
          message.nodeId,
          newNode,
          layoutSpacing,
        )
        documentModel.layout = nextPlacement
          ? {
              ...documentModel.layout,
              nodes: {
                ...(documentModel.layout?.nodes ?? {}),
                [nodeId]: nextPlacement,
              },
            }
          : autoLayoutCurrentGraph()

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `createSuccessorNode saved via ${mode}: ${message.nodeId} -> ${nodeId}`)
        await postSyncState()
        return
      }

      if (message?.type === 'autoLayout') {
        documentModel.layout = reconcileLayout(
          documentModel.graph,
          autoLayoutCurrentGraph(),
        )
        await persistLayout()
        postHostDebug(webviewPanel, 'autoLayout applied')
        await postSyncState()
        return
      }

      if (message?.type === 'setSpacing') {
        layoutSpacing = normalizeLayoutSpacing(message.value)
        documentModel.layout = autoLayoutCurrentGraph()
        postHostDebug(webviewPanel, `setSpacing applied: ${layoutSpacing}`)
        await postSyncState()
        return
      }

      if (message?.type === 'setBackgroundStyle') {
        backgroundStyle = normalizeBackgroundStyle(message.value)
        await extensionContext.workspaceState.update(
          toBackgroundStyleStorageKey(documentModel.sourcePath),
          backgroundStyle,
        )
        postHostDebug(webviewPanel, `setBackgroundStyle applied: ${backgroundStyle}`)
        await postSyncState()
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

      if (message?.type === 'dragGroup' && message.groupId && message.delta) {
        documentModel.layout = shiftGroupWithChildren(
          documentModel.layout,
          message.groupId,
          message.delta,
          documentModel.graph,
        )
        await persistLayout()
        await postSyncState()
        return
      }

      if (message?.type === 'deleteNode' && message.nodeId) {
        documentModel.graph = deleteNode(documentModel.graph, message.nodeId)
        documentModel.layout = {
          ...documentModel.layout,
          nodes: Object.fromEntries(
            Object.entries(documentModel.layout.nodes ?? {}).filter(([nodeId]) => nodeId !== message.nodeId),
          ),
        }

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `deleteNode saved via ${mode}: ${message.nodeId}`)
        await postSyncState()
        return
      }

      if (message?.type === 'deleteGroup' && message.groupId) {
        documentModel.graph = deleteGroup(documentModel.graph, message.groupId)
        documentModel.layout = reconcileLayout(documentModel.graph, {
          ...documentModel.layout,
          groups: Object.fromEntries(
            Object.entries(documentModel.layout.groups ?? {}).filter(([groupId]) => groupId !== message.groupId),
          ),
        })

        const mode = await persistGraph()
        await persistLayout()
        postHostDebug(webviewPanel, `deleteGroup saved via ${mode}: ${message.groupId}`)
        await postSyncState()
        return
      }

      if (message?.type === 'deleteEdge') {
        const edgeIdentity = message?.edgeId ? { edgeId: message.edgeId } : message.edge
        if (!edgeIdentity) {
          return
        }

        documentModel.graph = deleteEdge(documentModel.graph, edgeIdentity)

        const mode = await persistGraph()
        postHostDebug(webviewPanel, `deleteEdge saved via ${mode}`)
        await postSyncState()
        return
      }

      if (message?.type === 'renameEdgeLabel') {
        const edgeIdentity = message?.edgeId ? { edgeId: message.edgeId } : message.edge
        if (!edgeIdentity) {
          return
        }

        const nextLabel = typeof message.label === 'string' ? message.label.trim() : ''
        const currentEdge = message.edge ?? documentModel.graph.edges.find((edge) => edge.id === message.edgeId)
        if (!currentEdge) {
          return
        }
        const matchingNextLabelCount = documentModel.graph.edges.filter((edge) =>
          edge.from === currentEdge.from
          && edge.to === currentEdge.to
          && (edge.label ?? '') === nextLabel
          && (edge.style ?? '') === (currentEdge.style ?? '')
          && edge.id !== currentEdge.id
        ).length
        const duplicate = matchingNextLabelCount > 0
        if (duplicate) {
          postHostDebug(webviewPanel, `renameEdgeLabel ignored: duplicate ${currentEdge.from} -> ${currentEdge.to}`)
          return
        }

        documentModel.graph = renameEdgeLabel(documentModel.graph, edgeIdentity, nextLabel)
        const mode = await persistGraph()
        postHostDebug(webviewPanel, `renameEdgeLabel saved via ${mode}: ${currentEdge.from} -> ${currentEdge.to}`)
        await postSyncState()
        return
      }

      if (message?.type === 'renameGroup' && message.groupId && typeof message.label === 'string') {
        const nextLabel = message.label.trim()
        if (!nextLabel) {
          return
        }

        documentModel.graph = renameGroupLabel(documentModel.graph, message.groupId, nextLabel)
        const mode = await persistGraph()
        postHostDebug(webviewPanel, `renameGroup saved via ${mode}: ${message.groupId}`)
        await postSyncState()
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
        const createdEdge = documentModel.graph.edges.at(-1)
        if (createdEdge?.id) {
          documentModel.layout = {
            ...documentModel.layout,
            edges: {
              ...(documentModel.layout.edges ?? {}),
              [createdEdge.id]: {
                sourceSide: message.edge.sourceSide ?? 'right',
                targetSide: message.edge.targetSide ?? 'left',
              },
            },
          }
        }
        const mode = await persistGraph()
        await persistLayout()
        postHostDebug(webviewPanel, `createEdge saved via ${mode}: ${from} -> ${to}`)
        await postSyncState()
        return
      }

      if (message?.type === 'saveNodeLayout' && message.nodeId && message.layout) {
        documentModel.layout = {
          ...documentModel.layout,
          nodes: {
            ...(documentModel.layout.nodes ?? {}),
            [message.nodeId]: message.layout,
          },
        }
        await persistLayout()
        await postSyncState()
        return
      }

      if (message?.type === 'moveNodeToGroup' && message.nodeId) {
        documentModel.graph = moveNodeToGroup(documentModel.graph, message.nodeId, message.groupId ?? null)
        documentModel.layout = reconcileLayout(documentModel.graph, documentModel.layout)
        const mode = await persistGraph()
        await persistLayout()
        postHostDebug(webviewPanel, `moveNodeToGroup saved via ${mode}: ${message.nodeId}`)
        await postSyncState()
      }
    } catch (error) {
      outputChannel.appendLine(`[message-handler] failed: ${error?.stack ?? error}`)
      postHostDebug(webviewPanel, `handler failed: ${error?.message ?? String(error)}`)
      void vscode.window.showErrorMessage(`Diagram editor failed: ${error?.message ?? String(error)}`)
    }
  })

  webviewPanel.onDidDispose(() => {
    clearTimeout(refreshTimer)
    documentChangeDisposable.dispose()
    messageDisposable.dispose()
  })

  fitViewRequestToken += 1
  await rerender(
    initialDocumentError
      ? {
          ...documentModel,
          documentError: initialDocumentError,
        }
      : {
          ...documentModel,
          documentError: null,
        },
    { fitViewOnLoad: true },
  )
  postHostDebug(webviewPanel, 'host ready')
}
