# UC76 — View Test History (Web)

I3-086 / BR-231; backend I3-085 / BR-230; mobile I3-087 / BR-232.

Open **Lịch Sử Xét Nghiệm** at `/patient/test-history`. App.jsx registers the route for Admin/Manager, Doctor, LabHead, LabTech/LabTechnician and Patient; Sidebar/AppHeader provide the corresponding menu and title. Reuse the clinical shell, Medical Blue, Bootstrap cards/table/Offcanvas and existing skeleton style.

## Workflow

Search by result code or exact result/sample/package ID (300 ms debounce), optionally filter patient ID and inclusive creation dates, clear filters, choose page size and navigate pages. The counter comes from the server. Dates use UTC+7; unknown dates are shown as Chưa ghi nhận and excluded by date filters.

Open a row to load detail independently through the guarded endpoint; deep links use `?result=<persisted-id>`. Closing/changing detail aborts requests. List responses contain metadata only. Unavailable detail shows **Đang phân tích**, without values/conclusion. Published detail shows stored measurements, units, reference text, flags and conclusion. No thresholds, previous measurements or ranges are fabricated. Refresh re-fetches publication state instead of using an export/demo endpoint.

Patient queries cannot expand server ownership scope; clinical staff have their designated access. Unverified dependent links grant no permission. Nurse/Receptionist/Cashier/WarehouseStaff have no history menu or route access and are also denied by the backend. Publication requires approved signed results, no rerun request and the corresponding completed/stored sample. Signature presence is not a new cryptographic verification feature.

## Files and verification

- `features/patient/api/testHistoryApi.js`: shared authenticated client, cancellation and server errors.
- `features/patient/pages/TestHistoryPage.jsx`: search/list and separate guarded detail drawer.
- App.jsx, Sidebar.jsx, AppHeader.jsx: route/menu/title only.
- `tests/uc76-access-checks.mjs`: actual guard/sidebar render checks.

`npm run build` passes (562 modules), with the existing bundle-size warning. `node tests/uc76-access-checks.mjs` passes 13 role checks. package.json has no lint/test script; no nonexistent script is claimed. Backend integration checks cover publication gating, ownership, audit and validation.

No browser visual/end-to-end test or screenshot is claimed. Before merge, manually check staff/Patient and denied roles, another patient's deep link, unsigned/rerun details, empty/unknown dates, invalid date ranges, pagination, retry, cancel/close during requests and refreshed approval state using test records. Existing report/export screens are unchanged and are not called by UC76.
