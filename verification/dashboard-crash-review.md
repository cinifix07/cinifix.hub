# Dashboard crash repaired

27 October 2026. Backup: `backups/dashboard-crash-20261027-010900/`.

## Observed cause

Inspected the owner's existing Edge tab at `http://192.168.0.108:5173/#admin` using the computer-use skill. The console showed `TypeError: crypto.randomUUID is not a function` in `ChatController`, which propagated to the application error boundary and replaced the entire dashboard with “Unable to load CINIFIX”.

## Fix

- Added `src/chat/client-id.js`: use native UUID generation when available, then a random-bytes UUID fallback, with a legacy non-secret ID fallback for environments without the crypto API.
- Updated both tab IDs and outgoing-message idempotency IDs in `src/chat/chat.jsx` to use that helper. These IDs are not authentication credentials; server session and membership checks are unchanged.
- No backend deployment, password or role change was needed.

## Actual verification

- Production build: passed.
- ESLint for the changed source: passed.
- `node verification/client-id-regression.mjs`: passed native UUID support, absence of `randomUUID`, absence of crypto, compatible ID format, and uniqueness across 1,000 generated IDs in each fallback environment.
- Reloaded the owner's existing authenticated Edge tab on the same LAN HTTP address. The actual **CINIFIX Admin dashboard loaded**, showing today's task list and chat launcher. The previous console crash was absent after reload.
- Opened the actual Messages panel successfully and closed it, leaving the dashboard available. No message, group, task, account or password was created/changed, and the owner's password was not read or entered. Normal application presence updates may occur while the authenticated dashboard is open.

Computer-use source: `C:/Users/ACER ASPIRE 3/.codex/plugins/cache/openai-bundled/computer-use/26.1021.31345/skills/computer-use/SKILL.md`.
