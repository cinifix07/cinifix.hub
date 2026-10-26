// Read-only metadata and query availability; no narrative text is printed.
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
const child = spawn(process.execPath, [resolve('node_modules/convex/bin/main.js'), 'function-spec', '--deployment', 'agile-gull-167'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
let output = ''
child.stdout.on('data', data => { output += data })
child.stderr.resume()
await new Promise((resolveResult, reject) => { child.on('error', reject); child.on('close', code => code === 0 ? resolveResult() : reject(Error('Unable to read deployed function metadata.'))) })
const spec = JSON.parse(output)
const names = new Set(spec.functions.map(fn => fn.identifier))
for (const name of ['narratives.js:listPage', 'narratives.js:createManual', 'narratives.js:update', 'narratives.js:remove', 'events.js:listPage', 'sessions.js:me']) console.log(`${name}: ${names.has(name) ? 'deployed' : 'MISSING'}`)
const client = new ConvexHttpClient('https://agile-gull-167.convex.cloud')
for (const [name, fn] of [['reports', anyApi.narratives.listPage], ['events', anyApi.events.listPage]]) {
  try { const result = await client.query(fn, { paginationOpts: { cursor: null, numItems: 1 } }); console.log(`${name} query: available; first page rows=${result.page.length}`) }
  catch (error) { console.log(`${name} query: ${/Could not find public function|not found/i.test(String(error)) ? 'function missing' : /sign in|session|access|authenticated/i.test(String(error)) ? 'requires authentication' : 'query failed'}`) }
}
