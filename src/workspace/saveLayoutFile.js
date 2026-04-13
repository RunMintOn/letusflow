export async function saveLayoutFile(fsLike, path, layout) {
  await fsLike.writeFile(path, JSON.stringify(layout, null, 2))
}
