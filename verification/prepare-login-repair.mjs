// LOCAL PREPARATION ONLY. This script neither generates signing keys nor calls
// Convex. The resulting isolated checkout needs approval before deployment.
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { stripTypeScriptTypes } from 'node:module'
import { resolve } from 'node:path'

const stage = 'tmp/login-repair-20261027'
const root = resolve('.')
const stagePath = resolve(stage)
if (!stagePath.startsWith(root + '\\') && !stagePath.startsWith(root + '/')) throw Error('Staging path must stay in this workspace.')
await mkdir(`${stage}/convex`, { recursive: true })
await cp('convex', `${stage}/convex`, { recursive: true, filter: source => !source.endsWith('events.ts') && !source.includes('_generated/ai') && !source.includes('_generated\\ai') })

// Restore only the narrative schema/functions from the pre-upgrade backup,
// keeping the separately pending narrative feature out of this deployment.
const baselinePath = 'backups/narrative-upgrade-20261026-231756/convex'
const baseline = await readFile(`${baselinePath}/schema.ts`, 'utf8')
const current = await readFile('convex/schema.ts', 'utf8')
const start = current.indexOf('  narratives: defineTable(')
const chat = current.indexOf('  authSessions: defineTable(')
const oldStart = baseline.indexOf('  narratives: defineTable(')
const oldEnd = baseline.lastIndexOf('});')
if (start < 0 || chat <= start || oldStart < 0 || oldEnd <= oldStart) throw Error('Unexpected schema shape; refusing to prepare a deployment.')
await writeFile(`${stage}/convex/schema.ts`, current.slice(0, start) + baseline.slice(oldStart, oldEnd) + current.slice(chat))
await cp(`${baselinePath}/narratives.ts`, `${stage}/convex/narratives.ts`)
const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
await writeFile(`${stage}/package.json`, JSON.stringify({ name: 'cinifix-login-repair', private: true, type: 'module', dependencies: packageJson.dependencies }, null, 2) + '\n')
await writeFile(`${stage}/.env.local`, 'CONVEX_DEPLOYMENT=dev:agile-gull-167\nVITE_CONVEX_URL=https://agile-gull-167.convex.cloud\n')

// Use the installed official API template locally, with Node's built-in TS
// stripping. No package install or remote code generation is necessary.
const asModule = source => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
const commonUrl = asModule(await readFile('node_modules/convex/src/cli/codegen_templates/common.ts', 'utf8'))
const apiSource = (await readFile('node_modules/convex/src/cli/codegen_templates/api.ts', 'utf8')).replace('"./common.js"', JSON.stringify(commonUrl))
const { apiCodegen } = await import(asModule(apiSource))
async function files(directory) {
  const result = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${item.name}`
    if (item.isDirectory()) result.push(...await files(path))
    else result.push(path)
  }
  return result.sort()
}
const modulePaths = (await files(`${stage}/convex`)).filter(path => path.endsWith('.ts') && !path.includes('/_generated/') && !/\/(schema|http|auth\.config|convex\.config)\.ts$/.test(path)).map(path => path.slice(`${stage}/convex/`.length))
const api = apiCodegen(modulePaths)
await writeFile(`${stage}/convex/_generated/api.js`, api.JS)
await writeFile(`${stage}/convex/_generated/api.d.ts`, api.DTS)
const manifest = []
for (const path of await files(`${stage}/convex`)) {
  manifest.push({ file: path.slice(stage.length + 1), sha256: createHash('sha256').update(await readFile(path)).digest('hex') })
}
await writeFile(`${stage}/manifest.json`, JSON.stringify({ target: 'dev:agile-gull-167', activated: false, includes: ['secure secret-key sessions', 'authenticated account management', 'chat dependencies'], excludes: ['pending narrative upgrade', 'production deployment', 'Vercel deployment', 'live test records'], files: manifest }, null, 2) + '\n')
console.log(`Prepared ${stage}: ${modulePaths.length} backend modules; no keys, network requests or deployments.`)
