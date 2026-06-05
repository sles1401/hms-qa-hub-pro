## Scope

Implement 5 admin-mode enhancements for HMS QA HUB.

### 1. Audit Trail Import (JSON/CSV)
- Add Import button in `AuditTrailTab.tsx` accepting `.json` and `.csv`
- Parse → validate → merge (dedupe by id) or overwrite via dialog
- Reuse existing filters (user, target/module, date range)
- Wire merge handler through `Index.tsx` to `store.ts` audit log

### 2. Sync Diff CSV Export
- In `SyncDiffDialog.tsx`, add "Download Diff CSV" button before Confirm
- Columns: Submodule, Total Before, Total After, Passed Before, Passed After, Delta Passed

### 3. User Management Page
- Create `src/pages/Users.tsx` + route `/users`
- Store users in `localStorage` (`hms-qa-users`): `{id, name, email, role}`
- Admin QA can add/edit/delete users and toggle role (Admin QA / Viewer)
- Current active user persisted; `useRole` reads from active user's role
- Add sidebar link gated to Admin
- All existing `isAdmin` gates already cover Sync/Generate Report/Edit Stats — verify

### 4. Editable Enterprise PDF Template
- Add `ReportSettings` in `store.ts`: `{ logoDataUrl, heading, footerText, releaseDate }`
- Persist in `localStorage` (`hms-qa-report-settings`)
- New `ReportSettingsDialog.tsx` (admin-only) to edit fields + upload logo
- Update `lib/reports.ts` `generateReport` to accept settings and apply to enterprise PDF (logo top-right, custom heading, footer text + release date)

### 5. Regression Threshold Settings
- Add `RegressionSettings` in `store.ts`: `{ thresholdPct: number, watchedCategoryIds: string[] }`
- Persist in `localStorage` (`hms-qa-regression-settings`)
- New settings panel in `DashboardTab.tsx` (admin-only) to set threshold (default 3) and pick categories
- Update `RegressionAlert` logic to use threshold + filter by watched categories

## Files

**Create:**
- `src/pages/Users.tsx`
- `src/components/ReportSettingsDialog.tsx`
- `src/components/RegressionSettingsDialog.tsx`
- `src/lib/userManagement.ts`

**Edit:**
- `src/App.tsx` — add `/users` route
- `src/components/AuditTrailTab.tsx` — import button + merge/overwrite
- `src/components/SyncDiffDialog.tsx` — CSV export
- `src/components/Sidebar.tsx` — Users link (admin only)
- `src/components/ReportDialog.tsx` — open settings editor for enterprise
- `src/components/DashboardTab.tsx` — wire RegressionSettingsDialog, use threshold
- `src/lib/reports.ts` — accept ReportSettings
- `src/lib/store.ts` — types + helpers for report/regression settings
- `src/hooks/useRole.ts` — sync with active user
- `src/pages/Index.tsx` — wire audit import handler

## Notes
- Pure frontend/localStorage; no backend changes
- All admin-gated buttons check `isAdmin` from `useRole`
