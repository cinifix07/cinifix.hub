import { readFile } from 'node:fs/promises'
import { randomFillSync } from 'node:crypto'
import assert from 'node:assert/strict'
import vm from 'node:vm'
const source = (await readFile('src/chat/client-id.js', 'utf8')).replace('export function', 'function')
function load(crypto) { return vm.runInNewContext(`${source}\ncreateClientId`, { crypto }) }
const native = load({ randomUUID: () => 'native-browser-id' })
assert.equal(native(), 'native-browser-id')
const lan = load({ getRandomValues: array => randomFillSync(array) })
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
const lanIds = new Set(Array.from({ length: 1000 }, () => lan()))
assert.equal(lanIds.size, 1000)
for (const id of lanIds) assert.match(id, uuid)
const legacy = load(undefined)
const legacyIds = new Set(Array.from({ length: 1000 }, () => legacy()))
assert.equal(legacyIds.size, 1000)
for (const id of legacyIds) assert.match(id, /^[a-zA-Z0-9-]{16,80}$/)
const chat = await readFile('src/chat/chat.jsx', 'utf8')
assert.equal(chat.includes('crypto.randomUUID('), false)
console.log('Passed: native UUID, LAN HTTP without randomUUID, legacy environment without crypto, server-compatible format, and unique tab/message IDs. No live writes.')
