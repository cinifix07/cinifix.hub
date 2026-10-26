// Read only recent execution metadata; never emit arguments, results or logs.
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
const child = spawn(process.execPath, [resolve('node_modules/convex/bin/main.js'), 'logs', '--history', '200', '--success', '--jsonl', '--deployment', 'agile-gull-167'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
let buffer = ''
let count = 0
child.stderr.resume()
child.stdout.on('data', chunk => {
  buffer += chunk.toString()
  const lines = buffer.split('\n'); buffer = lines.pop()
  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      const path = entry.udfPath ?? entry.identifier
      if (typeof path !== 'string' || !/userActions:verifySecretKey|userActions.js:verifySecretKey|sessions:issue|sessions.js:issue|sessionActions:refresh|sessionActions.js:refresh/.test(path)) continue
      console.log(JSON.stringify({ function: path, executionTimeMs: typeof entry.executionTime === 'number' ? Math.round(entry.executionTime * 1000) : null, failed: Boolean(entry.error), errorCategory: entry.error ? String(entry.error).includes('multiple accounts') ? 'duplicate-secret-key' : String(entry.error).includes('Too many') ? 'rate-limit' : 'server-error' : null }))
      count++
    } catch { /* Skip non-JSON CLI lines. */ }
  }
})
const timer = setTimeout(() => child.kill(), 10000)
child.on('close', () => { clearTimeout(timer); console.log(`Captured ${count} relevant login metadata entries; no argument or result values printed.`) })
