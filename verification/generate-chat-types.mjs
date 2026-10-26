// Offline code generation from the templates shipped with the installed Convex
// package. No deployment, credentials, network, or database access is involved.
// Full Convex codegen still needs the separately approved issuer configuration.
import { build } from 'esbuild'
import { readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function template(name) {
  const bundle = await build({ entryPoints: [resolve(`node_modules/convex/src/cli/codegen_templates/${name}.ts`)], bundle: true, platform: 'node', format: 'esm', write: false })
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
}
async function modules(path = 'convex') {
  const result = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name === 'ai') continue
    const target = `${path}/${entry.name}`
    if (entry.isDirectory()) result.push(...await modules(target))
    else if (entry.name.endsWith('.ts') && !['schema.ts', 'auth.config.ts', 'convex.config.ts', 'http.ts'].includes(entry.name)) result.push(target.slice('convex/'.length))
  }
  return result.sort()
}
const { apiCodegen } = await template('api')
const { serverCodegen } = await template('server')
const api = apiCodegen(await modules())
const server = serverCodegen({ useTypeScript: false, envVars: ['CINIFIX_AUTH_PRIVATE_KEY', 'CINIFIX_AUTH_PUBLIC_JWK', 'CINIFIX_AUTH_ISSUER'].map(name => [name, { type: 'value', value: '{"type":"string"}', optional: true }]) })
await writeFile('convex/_generated/api.js', api.JS)
await writeFile('convex/_generated/api.d.ts', api.DTS)
await writeFile('convex/_generated/server.js', server.JS)
await writeFile('convex/_generated/server.d.ts', server.DTS)
console.log('Generated local API and environment types using installed Convex templates. No deployment performed.')
