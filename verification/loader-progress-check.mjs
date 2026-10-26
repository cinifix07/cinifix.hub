import assert from 'node:assert/strict'
import { estimateWorkspaceProgress } from '../src/ui/loader-progress.js'
for (const verified of [false, true]) {
  let previous = 1
  assert.equal(estimateWorkspaceProgress(0, verified), 1)
  for (let elapsed = 0; elapsed <= 120000; elapsed += 100) {
    const value = estimateWorkspaceProgress(elapsed, verified)
    assert.ok(Number.isInteger(value) && value >= previous && value < 100)
    previous = value
  }
}
assert.ok(estimateWorkspaceProgress(2000, true) >= estimateWorkspaceProgress(2000, false))
assert.equal(estimateWorkspaceProgress(-10, false), 1)
console.log('Passed: progress starts at 1, increases monotonically, advances with verified access, and never reports 100 before workspace readiness.')
