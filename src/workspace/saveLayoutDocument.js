import { normalizeLayoutDocument } from '../model/layoutSchema.js'

export async function saveLayoutDocument(fsLike, layoutPath, layoutDocument) {
  const normalized = normalizeLayoutDocument(layoutDocument)
  await fsLike.writeFile(layoutPath, `${JSON.stringify(normalized, null, 2)}\n`)
}
