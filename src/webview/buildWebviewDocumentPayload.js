import { toWebviewSyncState } from './toWebviewSyncState.js'

export function buildWebviewDocumentPayload(documentModel) {
  return JSON.stringify(toWebviewSyncState(documentModel))
}
