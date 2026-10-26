# Login loading fix — 27 October 2026

Backup: `backups/login-speed-20261027-003549/`.

Changed files: `src/LOGIN/login.jsx`, `src/auth/session.jsx`, and `src/App.jsx`.

- Removed the artificial 220 ms success delay.
- Removed the premature “Signed in” state. The original delayed callback ran outside the form's try/catch; if an old backend response lacked the new session credentials, that callback could throw and leave the form permanently locked. Credential checks and the callback now run inside the error handler.
- The form stops showing loading after 2 seconds and allows a retry if verification has not completed. Late verification responses cannot subsequently sign the user in through that timed-out attempt.
- The same 2-second deadline is passed through to the secure session/dashboard handshake, rather than starting a second 2-second wait. If confirmation takes longer, the loading message becomes a recoverable timeout screen. A late valid server confirmation can still open the dashboard unless the user cancels.
- Restored sessions receive a 2-second initial loading budget as well. Returning to sign-in clears the pending credentials and attempts to revoke that session.
- Dashboard access still requires server-confirmed authentication and the server's current account/role response. No authentication bypass or simulated success was added.

Validation: production build passed; ESLint passed for all three edited components. No live login, timing benchmark, deployment, backend/schema change, or signing-key configuration was performed.

This caps the loading **presentation**, not successful authentication time on every network. The backend still uses its existing secret-key verification and requires the separately pending secure-session configuration/deployment. An old backend response now shows a clear sign-in-unavailable error instead of freezing. Successful 0–2 second login has not been measured or guaranteed.
