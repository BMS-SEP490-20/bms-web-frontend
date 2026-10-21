# UC71 — View Sample Timeline (Web)

Backlog I3-071 / BR-216; backend I3-070 / BR-215.

Open **Hành Trình Mẫu** at `/laboratory/sample-timeline`. App.jsx, Sidebar and AppHeader register the route, role-filtered menu and title. Reuse the clinical shell, Medical Blue accents, Bootstrap cards/tables and shared skeleton styles. A responsive Offcanvas separates long details from the directory. No mobile changes.

## Workflow

1. Search by barcode, exact sample ID or patient ID (300 ms debounce). Filter by sample status and inclusive collection dates, clear filters, change page size or navigate pages. Counter, loading, retry and empty states are included.
2. Open a row to see six recorded stages and a chronologically paginated timeline. Deep links use `?sample=<sample-id-or-exact-barcode>`. Closing details removes that parameter.
3. Times use UTC+7. Missing timestamps show **Chưa ghi nhận thời gian**; stages without evidence show **Chưa có dữ liệu**. Processing/preparation is distinct from machine analysis. No earlier stage is inferred from a later state.
4. Staff can expand separately paginated RFID scans with checkpoint, reader, scan state and attribution to explicit sample ID or current tray tag. A warning explains that shared/reused tags do not prove individual custody. The screen cannot alter sample state or create scans.
5. Open details refresh every 30 seconds while visible, with manual refresh available. Changing samples/pages or closing details cancels pending requests.

## Permissions and privacy

Access: Admin/Manager, Doctor, LabHead, LabTech/LabTechnician, Nurse/Phlebotomist, Receptionist and Patient. Nurse aliases are recognized in the existing guard/menu/header; WarehouseStaff is explicitly distinguished from Patient instead of falling through the existing unknown-role fallback. Backend authorization is authoritative.

Common dashboard/profile/password routes and menu items explicitly retain Nurse and WarehouseStaff access after recognizing these roles; WarehouseStaff is excluded from the UC71 route/menu and denied by the API.

Patient lists/deep links are restricted by an explicit account-to-patient link. No client identity grants access. Patients receive standardized progress without internal notes, operators, locations, RFID, result values or report links. Unverified dependent relations grant no access. Receptionists receive no clinical free text. The RFID toggle is absent for patient responses.

Official results require a completed/stored sample with approved, signed matching reports and no rerun request. Completion alone is insufficient. No result measurements appear here.

## Files

- `src/features/laboratory/api/sampleTimelineApi.js`: shared authenticated client and errors.
- `src/features/laboratory/pages/SampleTimelinePage.jsx`: directory, filters and navigation.
- `src/features/laboratory/components/SampleTimelineDrawer.jsx`: stages, events, separate RFID scans, polling and pagination.
- App.jsx, ProtectedRoute.jsx, Sidebar.jsx, AppHeader.jsx: route and necessary role/shell integration.

## Verification

`npm run build` succeeds; the existing bundle-size warning remains. package.json has no lint/test scripts. Backend checks cover HTTP permissions, cross-account access, redaction, invalid input, RFID attribution, approval/reruns and unchanged source documents.

`node tests/uc71-access-checks.mjs` passes 12 checks against the actual ProtectedRoute and Sidebar rendering: nursing aliases, isolation from patient-only access, denied warehouse/cashier navigation, retained common account menu and patient/LabTechnician entry. It uses the existing Vite/esbuild dependency and React server rendering, without adding packages or changing package.json. This is a rendering/role check, not a browser end-to-end test.

No browser visual/end-to-end checks or screenshots are claimed. Before merge, verify staff/Patient flows, denied Cashier/WarehouseStaff, another patient's deep link, unknown times, invalid dates, event/RFID pagination, retry, manual/30-second refresh, and closing/switching details during requests. Use test samples.
