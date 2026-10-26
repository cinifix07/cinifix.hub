// Local regression check of the actual login submit handler. No browser,
// network, test dependencies, credentials or database writes are involved.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { parseSync } from '@babel/core'

const source = await readFile('src/LOGIN/login.jsx', 'utf8')
const ast = parseSync(source, { configFile: false, babelrc: false, parserOpts: { sourceType: 'module', plugins: ['jsx'] } })
const component = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration
const handler = component.body.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'handleSubmit')
const handlerCode = source.slice(handler.start, handler.end)

function harness() {
  let now = 0, nextId = 0, resolveAction
  const timers = new Map()
  const state = { submitting: false, slow: false, status: null, calls: 0, accepted: 0 }
  const env = {
    password: 'local-synthetic-key', mounted: { current: true }, submissionPending: { current: false },
    requestTimer: { current: null }, connectionTimer: { current: null },
    Date: { now: () => now },
    window: { setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, due: now + delay }); return id }, clearTimeout: id => timers.delete(id) },
    setIsSubmitting: value => { state.submitting = value }, setIsSlow: value => { state.slow = value }, setStatus: value => { state.status = value },
    verifySecretKey: () => { state.calls++; return new Promise(resolve => { resolveAction = resolve }) },
    onLoginSuccess: result => { state.accepted++; assert.equal(result.token, 'local-test-token') },
  }
  const submit = vm.runInNewContext(`(${handlerCode})`, env)
  return { state, env, submit: () => submit({ preventDefault() {} }), resolve: result => resolveAction(result), advance: milliseconds => {
    now += milliseconds
    for (const [id, timer] of [...timers].sort((a, b) => a[1].due - b[1].due)) if (timers.has(id) && timer.due <= now) { timers.delete(id); timer.callback() }
  }, timers }
}
const success = { ok: true, token: 'local-test-token', refreshToken: 'local-test-refresh' }
const slow = harness()
const pending = slow.submit()
slow.advance(2000)
assert.equal(slow.state.slow, true)
assert.equal(slow.state.status.type, 'info')
assert.equal(slow.state.submitting, true)
await slow.submit()
assert.equal(slow.state.calls, 1, 'Do not send duplicate login attempts while waiting.')
slow.advance(4000)
slow.resolve(success)
await pending
assert.equal(slow.state.accepted, 1, 'A valid six-second response must open the session.')
assert.equal(slow.state.submitting, false)
assert.equal(slow.timers.size, 0)

const wrong = harness(); const wrongPending = wrong.submit()
wrong.advance(3000); wrong.resolve({ ok: false }); await wrongPending
assert.equal(wrong.state.status.text, 'Incorrect secret key.')
assert.equal(wrong.state.accepted, 0)

const disconnected = harness(); const disconnectedPending = disconnected.submit()
disconnected.advance(30000); await disconnectedPending
assert.equal(disconnected.state.status.text, 'The server did not respond. Please reconnect and try again.')
disconnected.resolve(success); await Promise.resolve()
assert.equal(disconnected.state.accepted, 0, 'Ignore a response after the real connection deadline.')

const mismatch = harness(); const mismatchPending = mismatch.submit()
mismatch.resolve({ ok: true }); await mismatchPending
assert.equal(mismatch.state.status.type, 'error')
assert.equal(mismatch.state.accepted, 0)
assert.equal(mismatch.state.submitting, false)

console.log('Passed: valid six-second login, two-second progress notice, duplicate-submit prevention, wrong key, connection timeout, late-response rejection, and missing-session response. No live calls or writes.')
