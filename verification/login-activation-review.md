# Login availability repair — ready for approval

27 October 2026. No activation performed.

## Confirmed cause

Read-only checks against the frontend's configured development deployment `agile-gull-167` succeeded. `convex env list --names-only --deployment agile-gull-167` returned **No environment variables set**. Deployed function metadata contains the earlier `userActions:verifySecretKey`; the secure-session integration is not active. The frontend's `SESSION_UNAVAILABLE` branch specifically runs when an accepted login response lacks the required token/refresh token.

The previous frontend change made the mismatch visible but did not complete the backend rollout. Changing the error wording alone cannot restore authentication.

## Prepared changes

- Replaced the misleading request to contact CINIFIX TECH in `src/LOGIN/login.jsx` and `convex/sessionActions.ts` with temporary-unavailability wording. Backup: `backups/login-availability-20261027-004258/`.
- Prepared a separate backend checkout at `tmp/login-repair-20261027/`, with a SHA-256 manifest in `manifest.json`. It contains the already implemented secure sessions, authenticated account management, and chat dependencies required by the current dashboard.
- The staged narrative implementation/schema comes from the pre-narrative-upgrade backup. Pending narrative feature/functions and its `events` table are excluded. The canonical project working tree retains the pending narrative upgrade for its separate approval.
- `verification/prepare-login-repair.mjs` reproduces this local preparation. It does not generate keys, contact Convex, deploy, or alter database records.

## Actual checks

- Frontend production build: passed.
- Lint for the edited login component and preparation script: passed.
- Isolated staged backend syntax/import bundling: passed (20 TypeScript modules).
- Semantic TypeScript checking and real secret-key login: not executed. No test frameworks were added.

## Exact activation being requested

1. Generate one RSA signing-key pair locally and configure `CINIFIX_AUTH_PRIVATE_KEY`, `CINIFIX_AUTH_PUBLIC_JWK`, and `CINIFIX_AUTH_ISSUER=https://agile-gull-167.convex.site` on **development deployment agile-gull-167**. Keep the private key out of source, command history, frontend environment variables and output. Refuse to overwrite an existing key configuration without reviewing it first.
2. Generate/analyze the staged Convex functions, resolve any reported errors, then activate **only the staged login/chat backend** on that development deployment with the development CLI's one-shot mode. All existing account passwords and operational records are preserved; the additive session/chat schema and future soft-archive behavior are included.
3. Verify deployed function availability and the public JWKS response using read-only requests. The existing frontend then has a compatible backend for real login.

This approval does not include production/Vercel publication, the pending narrative feature, test accounts, test messages, or test-record writes. An end-to-end login still requires the owner's own sign-in after activation. A successful login within 0–2 seconds cannot be guaranteed on every network; the UI loading budget remains two seconds.
