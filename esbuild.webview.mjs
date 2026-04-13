import esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/webview-app/main.jsx'],
  bundle: true,
  outfile: 'dist/webview/webview-app.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  loader: {
    '.css': 'css',
  },
})
