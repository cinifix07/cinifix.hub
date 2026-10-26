# Login repair activated

27 October 2026, approximately 12:52–12:55 AM, Asia/Singapore.

Approved development target: **agile-gull-167** (`https://agile-gull-167.convex.cloud`).

## Completed

- Verified the prepared source manifest before applying configuration.
- Generated an RSA signing-key pair and configured the three approved server environment variables. The private key was passed through stdin, never displayed, committed, or written to a local key file. Existing key configuration was checked before setup; no key rotation/overwrite was performed.
- Convex code generation and remote function analysis passed for the isolated staged backend.
- Activated `tmp/login-repair-20261027/` using `convex dev --once --typecheck disable --tail-logs disable --env-file .env.local`. CLI confirmed the exact target `agile-gull-167` and reported **Convex functions ready**.
- Published the secure session functions and chat dependencies required by the current frontend. The pending narrative-report upgrade was excluded. No production or Vercel deployment was performed.

## Actual post-deployment verification

`verification/login-deployment-result.json` records the sanitized results:

- Required login/session/chat functions are deployed.
- Public JWKS endpoint returns a valid RSA/RS256 key and no private key fields.
- The actual stored signing key successfully signs a local probe that verifies against the deployed public key. The probe is never sent to Convex and creates no session.
- An anonymous session query returns null.
- An anonymous chat read is rejected.
- The existing **CINIFIX** account exists, is active, and resolves to **admin** under the existing role model.
- Pending narrative event functions are absent from this isolated deployment.

No user's secret key was requested, changed, or used. No test login/session, account, message or operational test record was created. End-to-end login and its latency have not been measured; the owner can now sign in with the existing secret key against the activated backend. Formal Super Admin owner protections remain a separate proposed code change; this rollout preserves the existing Admin role.

## Local artifacts

- `verification/configure-login-signing.mjs`: approved in-memory key setup with source-manifest and no-overwrite checks.
- `verification/check-login-deployment.mjs`: read-only deployment/key/access checks; filters account lookup output so password hashes are never displayed or saved.
- `tmp/login-repair-20261027/manifest.json`: original reviewed pre-codegen source manifest. Generated bindings were subsequently refreshed by Convex codegen, as expected.
- The canonical `convex/` working tree still contains the separately pending narrative upgrade. Future deployment should deliberately select the intended scope rather than treating the full working tree as already deployed.
