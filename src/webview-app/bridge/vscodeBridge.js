let cachedVsCodeApi = null

export function getVsCodeApi() {
  if (cachedVsCodeApi) {
    return cachedVsCodeApi
  }

  if (typeof acquireVsCodeApi !== 'function') {
    return null
  }

  cachedVsCodeApi = acquireVsCodeApi()
  return cachedVsCodeApi
}

export function postToHost(message) {
  const api = getVsCodeApi()
  if (!api) {
    return false
  }

  api.postMessage(message)
  return true
}
