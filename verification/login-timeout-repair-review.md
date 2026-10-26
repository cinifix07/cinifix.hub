# Correct-password login timeout repair

27 October 2026. Backup: `backups/login-timeout-repair-20261027-010207/`.

## Confirmed cause

Read-only execution logs from the connected development deployment show successful `sessions:issue` operations taking 8–12 ms, with their enclosing `userActions:verifySecretKey` calls taking approximately 5,253–6,869 ms in recent attempts. The earlier frontend rejected its pending login promise at 2,000 ms, discarding those later successful responses. This was a frontend deadline bug, not evidence of an incorrect password.

The current secret-key-only verifier still checks all eligible account hashes to detect ambiguous duplicate keys. The observed total server time does not establish how much comes from hash verification versus cold starts or internal calls; no precise bottleneck attribution or successful sub-two-second login claim is made here.

## Fixed

- `src/LOGIN/login.jsx`: the two-second mark now shows a neutral progress notice and stops the spinner while preserving the pending verified result. It does not reject the login. Duplicate submissions remain disabled while verification runs. A separate 30-second connection deadline handles an unresponsive server.
- `src/LOGIN/login.css`: added neutral styling for the progress notice.
- `src/App.jsx`: slow secure-session confirmation remains active and opens the workspace automatically when verified. The old premature connection-error message is removed.
- Password validation and server-confirmed session requirements are unchanged. No account password, hash, role, signing key or backend function was changed for this fix.

## Actual validation

- Production build: passed.
- ESLint for both edited components: passed.
- `node verification/login-timeout-regression.mjs`: passed. It executes the actual submit handler locally with fake timers and synthetic responses, including a successful six-second response, the two-second progress notice, duplicate-submit protection, wrong key, 30-second connection failure, rejection of responses after that deadline, and missing session credentials. It uses the already installed Babel parser and Node built-ins, with no added dependencies, live calls or database writes.
- `verification/read-login-timing.mjs` read existing backend execution timings only. No new test login or session was created.

The frontend source and local build are updated. No Vercel/production frontend publication was performed. Actual server verification may still take over two seconds; this repair prevents that normal delay from rejecting a correct login. The owner can refresh the running frontend and retry without changing the password.
