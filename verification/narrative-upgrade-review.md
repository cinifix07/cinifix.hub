# Narrative Reports upgrade — review and release notes

Implemented locally on October 26, 2026, within the approved scope. The user declined additional test packages and requested build/static checks only. No runtime deployment was finalized and no live report/event records were written or deleted.

## What changed

| Files | Change |
| --- | --- |
| `src/ADMIN/admin.jsx`, `src/users/users.jsx` | Replace the duplicated report list/edit/print implementations with the shared reports workspace. Pass the current account name and existing Admin/User presentation scope. Preserve unrelated dashboard actions and daily-report prompts. |
| `src/reports/narrative-reports.jsx` | Spacious desktop workspace; full-screen mobile styling; fixed workspace header/footer; sticky table header; search/date/event filters; newest/oldest sorting; pagination; stable-ID selection; select visible/all matching; details; Admin-only delete confirmation; success/error feedback. |
| `src/reports/report-form.jsx`, `event-select.jsx`, `report-dialog.jsx` | Create/Edit forms with title, local report date, searchable event selection and optional event creation. Preserve full narrative and form values on failure. Lock duplicate submissions. |
| `src/reports/report-export.jsx`, `report-utils.js` | Selected/event/date-range export scopes, exact eligible report lists, configurable content, PDF preview and download. Disable empty exports. Invalidate stale previews when configuration/data changes. |
| `src/reports/report-pdf.js` | Lazy-loaded jsPDF A4 generation, embedded Noto Sans fonts, original badge, full narrative text, paragraph/page breaks and optional page numbers. Unsupported glyphs stop export with an explicit error rather than silently dropping text. |
| `src/reports/reports.css` | Login/dashboard-matched ivory, white, yellow and bronze styling, responsive tables/cards, separate editor/export dialogs and reduced-motion overrides. |
| `convex/schema.ts` | Add optional report title/event/type fields, one compatible daily-report index and an events table. Existing stored report documents require no rewrite or backfill. |
| `convex/narratives.ts` | Manual creation inserts independent reports; daily save/get still target the existing daily record. Manual reports may have zero tasks. Derive manual task counts from the selected user's schedules. Update supports metadata and prevents duplicate daily records. Add paginated reads. |
| `convex/events.ts` | Paginated event reads and event creation helper. Event creation and report save execute in the same mutation transaction. |
| `convex/_generated/api.d.ts` | Regenerated API bindings include events. |
| `package.json`, `package-lock.json` | Add the approved jsPDF dependency. No test dependencies were added. |
| `src/assets/fonts/*`, `public/fonts/NotoSans-OFL.txt` | Bundle open-source PDF fonts and distribute their license. |
| `verification/generate-narrative-sample.mjs`, `render-narrative-pdf.ps1` | Offline sample generation and native Windows PDF rendering for layout inspection. No Convex client or production data. |

The old report data remains compatible: records without titles receive a display-only date-based title, and records without event IDs remain unassociated. Selecting a report does not modify its database record.

## Backups

`backups/narrative-upgrade-20261026-231756/`

The backup preserves original paths for both dashboard components, the schema, narrative backend, generated Convex files and both package manifests. Newly created files have no previous version to back up.

## Checks completed

- Production Vite build: passed. PDF generation is a separate lazy-loaded chunk; PDF fonts are bundled assets.
- ESLint, excluding backups: passed.
- Backend TypeScript syntax and module bundling: passed with esbuild, without invoking database handlers. This is **not** a full TypeScript semantic typecheck.
- Convex API code generation: completed. The CLI contacted Convex for analysis/type generation; its code-generation path does not finalize the runtime deployment.
- Source comparison against backups: automatic daily narrative save, close/reminder scheduling and task-completion handlers in both dashboards are unchanged.
- Git whitespace check: passed.
- Static PDF specimen: generated 6 A4 pages containing two synthetic reports. All six rendered pages were visually inspected after the final pagination adjustment. Badge, accents (é/ñ), quotation marks, narrative wrapping, paragraph separation, continuation headers and page numbers are legible, with no clipped text.

## Not verified

Per the user's instruction, no test frameworks were installed and no live CRUD testing was performed. Saving, persistence, edit/delete, event creation/filtering, checkbox interactions, preview/download in the browser, mobile interaction, keyboard focus, API failures and a complete console/network check still require an approved deployed backend and end-to-end testing.

The current report queries require the new backend functions. Deploy the backend **before** publishing the updated frontend; opening the module against the old backend will show the report-load error state.

## Preserved limitations

- Login, sessions and server-side authentication were intentionally not redesigned. User scoping and Admin-only controls retain the application's existing behavior. The backend still lacks a verified server identity/role enforcement layer; `createdBy` is a data filter, not an authorization credential. Separate approval and implementation are required for authentication hardening.
- Reports/events load in bounded backend pages until the accessible collection is complete, then local filters, accurate totals, full selection and export operate on that collection. Very large collections may benefit from a later server-side metadata/search design.
- Narratives above 700 KB of UTF-8 text receive a clear size error; text is never silently truncated. The bundled PDF fonts do not cover every writing system or emoji. Unsupported glyphs produce a clear export error while the original report remains intact.
- Dependency installation reported 8 audit findings (1 moderate, 7 high). No unrelated dependency upgrades or audit fixes were applied.

## Approval still required

1. Deploy the compatible schema/functions to the selected Convex development environment. No production or Vercel deployment is included in that approval unless explicitly requested.
2. Separately authorize any live test that creates, edits or deletes report/event records, identifying disposable test records and intended cleanup.

## References

- jsPDF: https://github.com/parallax/jsPDF
- Convex pagination: https://docs.convex.dev/api/interfaces/server.PaginationResult
- Native PDF rendering: https://learn.microsoft.com/en-us/uwp/api/windows.data.pdf.pdfpage.rendertostreamasync
- Font source/license: https://github.com/notofonts/noto-fonts

## Static PDF specimen

`output/pdf/narrative-layout-sample.pdf` is a layout specimen only, not a real report export or evidence of live database persistence.
