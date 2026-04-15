import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as vscode from 'vscode'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputChannel = vscode.window.createOutputChannel('LetusFlow')
let extensionContext = null
const DEFAULT_BACKGROUND_STYLE = 'paper'

function loadModule(relativePath) {
  // 确保相对路径被正确解析为绝对路径，并转为 file:// URL
  const absolutePath = path.resolve(__dirname, relativePath)
  return import(pathToFileURL(absolutePath).href)
}

function toBackgroundStyleStorageKey(sourcePath) {
  return `diagramEditor.backgroundStyle:${sourcePath}`
}

function normalizeBackgroundStyle(value) {
  return value === 'obsidian' || value === 'gradient' ? value : DEFAULT_BACKGROUND_STYLE
}

async function resolveCustomTextEditor(document, webviewPanel) {
  try {
    const { resolveCustomFlowEditor } = await loadModule('./extension-helpers/resolveCustomFlowEditor.js')
    return await resolveCustomFlowEditor({
      document,
      webviewPanel,
      extensionContext,
      outputChannel,
      loadModule,
      normalizeBackgroundStyle,
      toBackgroundStyleStorageKey,
    })
  } catch (error) {
    outputChannel.appendLine(`[Extension] Failed to resolve custom editor: ${error.stack || error}`)
    vscode.window.showErrorMessage(`LetusFlow failed to start: ${error.message}`)
  }
}

export function activate(context) {
  extensionContext = context
  const providerRegistration = vscode.window.registerCustomEditorProvider(
    'diagramEditor.flowEditor',
    { resolveCustomTextEditor },
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  )
  context.subscriptions.push(providerRegistration)
}

export function deactivate() {}
