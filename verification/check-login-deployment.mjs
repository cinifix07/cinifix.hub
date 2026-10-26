// Read-only checks. No login attempts, sessions, users or messages are created.
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { importJWK, importPKCS8, jwtVerify, SignJWT } from 'jose'

const deployment = 'agile-gull-167'
const cloud = `https://${deployment}.convex.cloud`
const cli = resolve('node_modules/convex/bin/main.js')
async function run(args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [cli, ...args, '--deployment', deployment], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    child.stdout.on('data', data => { stdout += data })
    // Do not print arbitrary CLI output, since owner lookup contains hashes.
    child.stderr.resume()
    child.on('error', () => reject(Error('Unable to start read-only Convex check.')))
    child.on('close', code => code === 0 ? resolveResult(stdout) : reject(Error(`Read-only Convex check failed (exit ${code}).`)))
  })
}
const spec = JSON.parse(await run(['function-spec']))
const names = spec.functions.map(fn => fn.identifier).filter(name => typeof name === 'string')
const required = ['userActions.js:verifySecretKey', 'sessions.js:me', 'sessionActions.js:refresh', 'sessionActions.js:logout', 'chat/conversations.js:list', 'chat/messages.js:send']
for (const name of required) if (!names.includes(name)) throw Error(`Missing deployed function: ${name}`)
if (names.some(name => name.startsWith('events.js:'))) throw Error('Unexpected pending narrative event functions in the isolated deployment.')
const response = await fetch(`https://${deployment}.convex.site/.well-known/jwks.json`, { signal: AbortSignal.timeout(10000) })
if (!response.ok) throw Error(`Public JWKS endpoint returned ${response.status}.`)
const jwks = await response.json()
const key = jwks.keys?.find(key => key.kid === 'cinifix-session-v1')
if (!key || key.alg !== 'RS256' || key.kty !== 'RSA' || ['d', 'p', 'q', 'dp', 'dq', 'qi'].some(field => field in key)) throw Error('Public JWKS response did not match the expected safe RSA key.')
const publicKey = await importJWK(key, 'RS256')
// Validate the actual stored PEM without displaying or writing it. This token
// is verified locally only; it is never sent to Convex and has no DB session.
const configuredPem = await run(['env', 'get', 'CINIFIX_AUTH_PRIVATE_KEY'])
const privateKey = await importPKCS8(configuredPem.replace(/\\n/g, '\n'), 'RS256')
const issuer = `https://${deployment}.convex.site`
const probe = await new SignJWT({ check: true }).setProtectedHeader({ alg: 'RS256', kid: key.kid }).setIssuer(issuer).setAudience('cinifix').setSubject('configuration-check').setExpirationTime('1m').sign(privateKey)
await jwtVerify(probe, publicKey, { issuer, audience: 'cinifix' })
const client = new ConvexHttpClient(cloud)
if (await client.query(anyApi.sessions.me, {}) !== null) throw Error('Anonymous request unexpectedly returned a signed-in account.')
let protectedReadRejected = false
try { await client.query(anyApi.chat.conversations.list, { paginationOpts: { cursor: null, numItems: 1 } }) }
catch { protectedReadRejected = true }
if (!protectedReadRejected) throw Error('Anonymous chat read was not rejected.')
let owner = null
for (const normalizedName of ['cinifix', 'ciniifix']) {
  const account = JSON.parse(await run(['run', 'users:getByNormalizedName', JSON.stringify({ normalizedName })]))
  if (account) {
    owner = { name: account.name, role: account.role ?? (account.normalizedName === 'cinifix' ? 'admin' : 'user'), archived: account.archivedAt !== undefined }
    break
  }
}
const report = { deployment: `dev:${deployment}`, checkedAt: new Date().toISOString(), requiredFunctionsAvailable: true, publicJwksValid: true, publicJwksHasNoPrivateFields: true, storedSigningKeyMatchesPublishedKey: true, anonymousSessionIsNull: true, anonymousChatReadRejected: true, pendingNarrativeEventsExcluded: true, ownerAccount: owner, liveLoginTested: false }
await writeFile('verification/login-deployment-result.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
