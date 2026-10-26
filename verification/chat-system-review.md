# CINIFIX chat implementation review

Local implementation completed on 27 October 2026. Deployment and live validation remain pending separate approval. This report describes the chat change relative to the timestamped pre-chat backup, not all earlier login/dashboard/report work in the working tree.

## Backup

`backups/chat-system-20261026-235414/` contains pre-change copies of the affected existing application, backend, package, and generated files. The login component was backed up but needed no chat-specific edit. New files have no previous version. Additional pre-codegen server copies are also in that folder.

## Changes for review

| Files | Result |
| --- | --- |
| `src/chat/chat.jsx`, `chat.css` | Floating launcher, searchable/filterable conversation list, paginated threads, safe multiline text, send/retry state, read receipts, unread badges, member directory, group creation and administration, responsive layouts and reduced motion. |
| `src/auth/session.jsx` | Existing secret-key sign-in now supplies signed credentials to `ConvexProviderWithAuth`. Refresh is deduplicated; new sign-ins replace revoked sessions; credentials remain in per-tab session storage. No secret key is persisted. |
| `src/App.jsx`, `src/main.jsx` | Dashboard identity and role come from the verified server session. Legacy name/role/authenticated flags cannot grant access. Existing Admin/User components remain in use. |
| `src/ui/dashboard.jsx` | Shared chat launcher on authenticated dashboard pages, plus functional server-revoking sign-out and error feedback. Existing modal focus management is reused. |
| `convex/chat/conversations.ts` | Member-scoped real-time lists/details, stable-ID account directory, transactional direct-pair deduplication and verified self presence. |
| `convex/chat/messages.ts` | Membership-protected paginated reads, server-derived senders, idempotent client request IDs, sequence-based unread positions and direct-message read receipts. |
| `convex/chat/groups.ts` | Verified Admin creation, member/Admin-scoped management, rename/description, membership changes, read-only archive, batched current-user and opt-in future-user enrollment. |
| `convex/chat/presence.ts`, `shared.ts`, `limits.ts` | Per-tab heartbeat/expiry, verified membership/roles, bounded page sizes, safe identity returns, exact unread arithmetic and server rate limits. |
| `convex/sessions.ts`, `sessionActions.ts`, `authHelpers.ts` | RS256 JWT issuance/refresh, hashed opaque refresh credentials, server session expiry/revocation and active-account checks. |
| `convex/auth.config.ts`, `convex.config.ts`, `http.ts` | Custom JWT provider declarations, typed environment declarations, public-only JWKS endpoint. No actual key or environment value was generated or configured. |
| `convex/users.ts`, `userActions.ts`, `userArchives.ts` | Protect account administration on the server, page active secret-key candidates, reject ambiguous duplicate keys, preserve IDs through future soft archives/restores, and securely enroll new eligible users in opted-in groups. |
| `package.json`, `package-lock.json` | Added approved `jose` dependency. Comparing to the backup confirms no existing package version changed. |
| `convex/_generated/api.js`, `api.d.ts`, `server.js`, `server.d.ts` | Regenerated locally from templates shipped with the installed Convex package. |
| `verification/generate-chat-types.mjs`, `chat-static-check.mjs` | Reproducible offline template generation and backend syntax/import bundling. Neither executes database functions. |

## Schema additions

Existing tables and records are preserved. The change is additive:

- `users.archivedAt?` and `users.authVersion?`, with an active-account index.
- `authSessions`: user, issuer, hashed refresh token, auth version, expiry and revocation; indexes by refresh hash and user.
- `chatConversations`: direct/group, canonical direct pair, name/description, creator, timestamps, official/future-enrollment/archive flags, sequence, member count and preview. Indexes by direct pair and future-enrollment/archive flags.
- `chatMembers`: user/conversation, active state, member role, join/read positions and cumulative own-message counters. Indexes by active user membership, conversation/user, and active conversation membership.
- `chatMessages`: conversation, server-derived sender, body, sequence, sender sequence, timestamp and idempotency key. Indexes support history, last own message at a read position, and deduplication.
- `chatPresence`: verified user/session, tab ID, last seen and expiry. Indexes support expiry, last seen and per-session tab lookup.
- `chatRateLimits`: server-generated rate-limit key, time window and count.

Unread = conversation sequence minus last-read sequence minus own messages sent after that position. Counts do not require message fan-out to every group member. A read acknowledgement only covers the newest message actually loaded at the visible bottom of a focused thread. Opening the launcher alone does not mark anything read.

New members start with prior history treated as historical, with no initial unread backlog. Removing and explicitly re-adding a member resets that read baseline. Automatic enrollment does not undo an intentional membership removal.

## Access and behavior

- Every public chat function requires a verified, unexpired, unrevoked session and active existing account. Every conversation read/write checks membership. Admin rank grants no access to other users' private direct conversations.
- Role/password/account updates revoke prior sessions through `authVersion`; logout and scheduled expiry revoke sessions directly. JWTs expire within 15 minutes; refresh sessions expire after 24 hours.
- Role badges and presence are independent. Presence requires an acknowledged live heartbeat, expires after 90 seconds, and refreshes every 30 seconds. Separate tabs have separate records. Closing/disconnecting is best effort, with expiration as the fallback.
- Sending is limited to 10 messages per 10 seconds per account. Direct creation is limited to 20/minute, official-group creation to 5/minute, and group-management writes to 30/minute. Secret-key verification has a global 30/minute ceiling because the existing login has no pre-auth account identifier.
- Messages permit 10,000 characters / 40 KB, and render as React text. No HTML rendering, sample users, message-body logs, or client-supplied sender authorization was introduced.
- Removing/demoting an Admin who is the only active Admin in a non-archived group is refused until another Admin is added or the group is archived.
- Legacy archived records whose original account was previously deleted still restore compatibly with a new ID. Future soft archives retain the original user ID. Permanently removing an archive entry leaves the inactive account row reserved for history.
- Existing tasks/reports/allowances retain their prior functionality and backend access model; this is not a whole-application authorization audit.

## Actual validation

| Check | Actual result |
| --- | --- |
| `npm.cmd run build` | Passed, Vite production bundle generated. |
| `npx.cmd eslint src verification/generate-chat-types.mjs verification/chat-static-check.mjs` | Passed with no warnings/errors. |
| `node verification/chat-static-check.mjs` | Passed: syntax, imports and bundling of 21 backend TypeScript modules. This does **not** perform TypeScript semantic checking or run Convex handlers. |
| Offline API/environment generation | Passed using the installed Convex templates; no deployment or data writes. |
| Full `convex codegen --typecheck disable` | Did not complete: `CINIFIX_AUTH_ISSUER` is deliberately not configured yet. Initial existing-server env-export mismatch was resolved by generating the current template. |
| Live two-session messaging/security/presence/mobile/browser tests | Not run. No live chat messages, test users, group records or signing keys were created. |

The codegen analysis contacted Convex but did not activate a deployment. No `convex dev`, `convex deploy`, Vercel deployment, or live data mutation was performed for this chat work. No new test framework was installed, per instruction. npm reported 8 dependency audit findings during installation; no unrelated dependency fixes were applied or claimed.

## Remaining approval and rollout

1. Review and approve signing-key generation/configuration for the intended environment. Required server values: `CINIFIX_AUTH_PRIVATE_KEY` (PKCS8 RSA private key), `CINIFIX_AUTH_PUBLIC_JWK` (matching public JWK), and `CINIFIX_AUTH_ISSUER` (that deployment's HTTPS Convex site origin). Never put the private key or refresh token in `VITE_*` variables or commit them. No private key is needed in the frontend.
2. After configuration, run full Convex codegen and semantic type checking, then approve a coordinated **development** backend/frontend deployment. Do not publish the new frontend against the old backend. One sign-in is required after rollout; existing secret keys continue to be used.
3. Review all pending backend changes before deployment: the working tree also contains earlier narrative-report changes that have their own pending deployment approval. This chat approval does not silently approve publishing those changes.
4. Separately approve live test users/messages/groups. Validate Admin↔Admin, Admin↔User, User↔User, persistence/refresh, two-tab presence and expiry, read/unread races, duplicate retries, reconnect, group enrollment and removal, unauthorized direct-ID access, non-Admin group writes, role/archive revocation, keyboard focus, and mobile layouts in at least two independent authenticated sessions.
5. Production rollout remains pending successful live validation and explicit approval. Responsive behavior has been implemented but not visually/browser verified in this static-only pass. Last-Admin checks and very large membership lists should also be exercised at the intended organization size before production.

Reference contracts: [Convex custom JWT](https://docs.convex.dev/auth/advanced/custom-jwt), [custom auth integration](https://docs.convex.dev/auth/advanced/custom-auth), and [jose](https://github.com/panva/jose). The local project Convex guidelines were read before backend work.
