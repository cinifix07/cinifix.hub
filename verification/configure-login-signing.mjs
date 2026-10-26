// Approved setup for the explicitly selected development deployment only.
// Private keys stay in memory and go to the Convex CLI through stdin.
import { spawn } from 'node:child_process'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { importPKCS8, importJWK, SignJWT, jwtVerify } from 'jose'

const deployment = 'agile-gull-167'
const issuer = `https://${deployment}.convex.site`
const stage = 'tmp/login-repair-20261027'
const cli = resolve('node_modules/convex/bin/main.js')
const manifest = JSON.parse(await readFile(`${stage}/manifest.json`, 'utf8'))
if (manifest.target !== `dev:${deployment}`) throw Error('Unexpected deployment target.')
for (const entry of manifest.files) {
  const actual = createHash('sha256').update(await readFile(`${stage}/${entry.file}`)).digest('hex')
  if (actual !== entry.sha256) throw Error(`Prepared file changed: ${entry.file}`)
}
function run(args, input = '') {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    let stdout = '', stderr = ''
    child.stdout.on('data', value => { stdout += value })
    child.stderr.on('data', value => { stderr += value })
    child.on('error', () => reject(Error('Could not start the Convex CLI.')))
    child.on('close', code => code === 0 ? resolveResult({ stdout, stderr }) : reject(Error(`Convex command failed (exit ${code}); output withheld to protect signing material.`)))
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
const names = await run(['env', 'list', '--names-only', '--deployment', deployment])
if (/CINIFIX_AUTH_(PRIVATE_KEY|PUBLIC_JWK|ISSUER)/.test(names.stdout + names.stderr)) throw Error('Signing configuration already exists. Refusing to replace existing keys.')
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'cinifix-session-v1', use: 'sig', alg: 'RS256' }
const token = await new SignJWT({ check: true }).setProtectedHeader({ alg: 'RS256' }).setIssuer(issuer).setAudience('cinifix').setSubject('configuration-check').setExpirationTime('1m').sign(await importPKCS8(pem, 'RS256'))
await jwtVerify(token, await importJWK(jwk, 'RS256'), { issuer, audience: 'cinifix' })
const content = `CINIFIX_AUTH_PRIVATE_KEY=${JSON.stringify(pem)}\nCINIFIX_AUTH_PUBLIC_JWK='${JSON.stringify(jwk)}'\nCINIFIX_AUTH_ISSUER=${issuer}\n`
await run(['env', 'set', '--deployment', deployment], content)
console.log(`Configured three signing variables on dev:${deployment}. Private key was not written to disk or displayed. Local RSA sign/verify passed.`)
