# UC61 — Manage Lab Profiles (Web)

Backlog I3-041 / BR-186; backend I3-040 / BR-185.

Route `/laboratory/lab-profiles` is registered in App.jsx with Admin, Manager and LabHead access, matching the menu and backend authorization. UI uses the existing clinical shell, Bootstrap cards/tables/modals, Medical Blue accents and shared skeleton style. No mobile changes.

## Workflow

1. Open **Quản Lý Hồ Sơ Lab**. Search by name, qualification or exact account ID; filter by default room or creation dates; choose page size and navigate pages. Search is debounced and obsolete requests are canceled.
2. Choose **Thêm hồ sơ**. Search existing active Lab accounts with paginated options. Existing/archived profile identities are disabled. Fill professional name, qualification, existing Lab room and a 5–500-character reason.
3. Open a row's detail view, then **Chỉnh sửa hồ sơ**. Account ID stays read-only. Save sends the revision viewed and a required reason; stale edits show a reload action instead of overwriting another user's work. Unsaved form changes require discard confirmation.
4. From details, choose **Xóa hồ sơ**. The confirmation names the employee and explains archival/account preservation. A reason is required. Server checks current/future assignments and the viewed revision. A conflict preserves the reason and offers reload; successful deletion refreshes the list from page one.

All API requests use the existing authenticated API client. No mock success path or direct database access is added. Server validation errors remain visible with input intact; busy submissions disable repeated actions. UI provides loading, error/retry, empty and success states.

The data is professional employee information, not test panels or packages. A default room is independent of shift assignments. Legacy missing timestamps show **Chưa ghi nhận**. Date filters refer to the clinic's UTC+7 calendar days and exclude undated records. Delete archives the professional profile; it does not deactivate the login account or delete assignment history. Archived identities cannot be recreated through this screen.

## Files

- `src/features/lab-profiles/api/labProfileApi.js`: authenticated CRUD/reference requests and ProblemDetails handling.
- `src/features/lab-profiles/pages/LabProfilesPage.jsx`: directory, filters, pagination and detail workflow.
- `src/features/lab-profiles/components/LabProfileFormModal.jsx`: create/edit form with account lookup and concurrency handling.
- `src/features/lab-profiles/components/DeleteLabProfileModal.jsx`: explicit archival confirmation and reason.
- App.jsx, Sidebar.jsx, AppHeader.jsx: guarded route, menu and page title.

## Verification and review

`npm run build` succeeds. Vite still reports the repository's existing bundle-size warning. There is no lint or test script in this repository's package.json. Backend integration checks cover real HTTP CRUD, permissions, validation, duplicate identities, stale revisions, assignment guards and preservation of existing records.

The browser workflow has not been visually exercised in this environment; no screenshot or end-to-end browser result is claimed. Before merging, manually verify the workflow above with Admin/LabHead, denied access with a nonmanagement role, cancel/discard, network retry, validation errors, concurrent edits, blocked deletion and successful archival. Use test staff accounts rather than real clinical records.
