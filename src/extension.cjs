const path = require('node:path')
const { pathToFileURL } = require('node:url')
const vscode = require('vscode')

const outputChannel = vscode.window.createOutputChannel('LetusFlow')
let extensionContext = null
const DEFAULT_BACKGROUND_STYLE = 'paper'

function loadModule(relativePath) {
  return import(pathToFileURL(path.join(__dirname, relativePath)).href)
}

function toBackgroundStyleStorageKey(sourcePath) {
  return `diagramEditor.backgroundStyle:${sourcePath}`
}

function normalizeBackgroundStyle(value) {
  return value === 'obsidian' || value === 'gradient' ? value : DEFAULT_BACKGROUND_STYLE
}

async function resolveCustomTextEditor(document, webviewPanel) {
  const { resolveCustomFlowEditor } = await loadModule('./extension-helpers/resolveCustomFlowEditor.js')
  return resolveCustomFlowEditor({
    document,
    webviewPanel,
    extensionContext,
    outputChannel,
    loadModule,
    normalizeBackgroundStyle,
    toBackgroundStyleStorageKey,
  })
}

function activate(context) {
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

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
