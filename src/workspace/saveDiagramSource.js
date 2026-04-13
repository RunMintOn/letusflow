export async function saveDiagramSource(fsLike, path, sourceText) {
  await fsLike.writeFile(path, sourceText)
}
