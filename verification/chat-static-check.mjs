import { build } from 'esbuild'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

async function sources(directory) {
  const files = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name.startsWith('_')) continue
    const path = `${directory}/${item.name}`
    if (item.isDirectory()) files.push(...await sources(path))
    else if (item.name.endsWith('.ts')) files.push(resolve(path))
  }
  return files
}
const entryPoints = await sources('convex')
await build({ absWorkingDir: process.cwd(), entryPoints, bundle: true, write: false, platform: 'node', format: 'esm', tsconfigRaw: {}, external: ['convex/*'], outdir: 'unused-static-check' })
console.log(`Backend syntax, imports and bundling passed (${entryPoints.length} TypeScript modules). This is not a TypeScript typecheck or a live function test.`)
