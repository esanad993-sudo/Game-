// ─── scripts/build-demo.mjs ──────────────────────────────────────────────────
// Bundles the standalone engine demo into ONE self-contained HTML file at
// public/demo-game.html. The output has no external assets and can be opened
// offline / on a Chromebook, or served from the /public folder.
//
// Usage:  node scripts/build-demo.mjs

import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const outJs = join(root, '..', 'public', 'demo-game.js')

const result = await build({
  entryPoints: [join(root, '..', 'src/game/demo/main.ts')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['chrome80'],
  write: false,
  logLevel: 'info',
})

const js = result.outputFiles[0].text
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#0b1220">
<title>GameForge Engine Demo</title>
</head>
<body>
<script>${js}</script>
</body>
</html>`

await writeFile(join(root, '..', 'public', 'demo-game.html'), html)
await writeFile(outJs, js)
const kb = (js.length / 1024).toFixed(1)
console.log(`Built public/demo-game.html (${kb} kB, single file, offline-ready)`)
