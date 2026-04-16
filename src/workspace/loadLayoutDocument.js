import { normalizeLayoutDocument } from '../model/layoutSchema.js'

export async function loadLayoutDocument(fsLike, layoutPath) {
  try {
    const rawLayout = await fsLike.readFile(layoutPath)
    return normalizeLayoutDocument(JSON.parse(rawLayout))
  } catch (error) {
    if (error?.code === 'ENOENT' || /ENOENT|Missing file/.test(String(error?.message ?? ''))) {
      return normalizeLayoutDocument()
    }

    throw error
  }
}
