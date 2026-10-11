# API List (frontend calls) — per-file

Generated: 2025-10-31
Base gateway used by frontend (default in `src/services/api.js`): `https://localhost:7000/gateway`

Notes
- "Upstream path" below denotes the path the frontend calls (relative to the API base).
- Many files use both `/gateway/...` literal paths and non-`/gateway` paths; since the frontend baseURL already contains `/gateway`, this inconsistency can produce `.../gateway/gateway/...` URLs.
- `ocelot.json` (api-gateway) contains mappings for many of these upstream paths to downstream services (IAM, TestOrder, Patient, etc.).

---

## src/services/api.js
- Purpose: Axios instance and interceptors
- Base URL: `process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL || 'https://localhost:7000/gateway'`
- (No direct endpoint calls in this file)

---

## src/services/authService.js
- POST /iam/auth/login
- POST /iam/auth/register
- POST /iam/auth/otp/sendotp (candidates `/iam/auth/otp/send` in comments)
- POST /iam/auth/otp/verify (candidates `/iam/auth/otp/verifyotp` sometimes used)

Files: `src/services/authService.js`
Gateway mapping: oc elot.json contains `/iam/*` entries (mapped to IAM downstream service)

---

## src/services/patientService.js
- GET /patient
- GET /patient/{id}
- GET /patient/email/{email}
- GET /patient/search?key=...
- POST /patient/register (candidates: `/Patients/register`, `/patient`)
- PUT /patient/{id}
- DELETE /patient/{id}
- Candidate appointment endpoints used by `getPatientHistory`:
  - /testorder/appointment
  - /testorder/appointments
  - /appointments
  - /appointment
- Candidate lab test endpoints used by `getPatientHistory`:
  - /testorder/testresult
  - /testorder/labTests
  - /labTests
  - /testresult

Files: `src/services/patientService.js`, `src/contexts/AuthContext.js` (uses patientService)
Gateway mapping: oc elot.json includes `/patient` upstream -> `/Patients` downstream

---

## src/services/testOrderService.js
- GET /testorder/testresult
- GET /testorder/testresult/{id}
- POST /testorder/testresult
- PUT /testorder/testresult/{id}
- DELETE /testorder/testresult/{id}
- GET /testorder/testparameter
- GET /testorder/testparameter/{id}
- PUT /testorder/testparameter/{id}
- GET /testorder/testordercomment

Gateway-specific Doctor / DoctorShift endpoints (this file uses `/gateway/...` literals):
- GET /gateway/testorder/doctor/{id}
- GET /gateway/testorder/doctorshift
- POST /gateway/testorder/doctorshift
- PUT /gateway/testorder/doctorshift/{id}
- DELETE /gateway/testorder/doctorshift/{id}
- GET /gateway/testorder/doctor

Also contains non-gateway variants:
- GET /testorder/doctorshift
- GET /testorder/doctorshift/{id}
- GET /testorder/doctor/{id}

Files: `src/services/testOrderService.js`, `src/components/ShiftManagement/ShiftManagement.js` (uses these helpers)
Gateway mapping: `ocelot.json` contains both `/testorder/...` and `/gateway/testorder/...` upstream templates mapped to TestOrder downstream

---

## src/services/sampleService.js
- GET /testorder/bloodsample
- GET /gateway/testorder/bloodsample/{id}
- POST /gateway/testorder/bloodsample
- PUT /gateway/testorder/bloodsample/{id}
- DELETE /gateway/testorder/bloodsample/{id}
- GET many list calls: /gateway/testorder/bloodsample
- GET /gateway/testorder/bloodsample/{sampleId}
- PUT /gateway/testorder/appointment/{appointmentId}
- POST /gateway/testorder/testresult
- GET /gateway/testorder/appointment/{appointmentId}

Other alternative/legacy paths referenced:
- /samples/{id}
- /appointments/{id}
- /patients/{id}
- /labTests
- /appointments

Files: `src/services/sampleService.js`, `src/pages/SampleManagement.js`
Gateway mapping: oc elot.json includes TestOrder/bloodsample endpoints (verify mapping present in file)

---

## src/services/invoiceService.js
- GET /invoices
- GET /invoices/{id}
- POST /invoices
- PUT /invoices/{id}
- PATCH /invoices/{id}
- DELETE /invoices/{id}

Files: `src/services/invoiceService.js`, used by pages: `src/pages/Invoices.js`, `src/pages/Reports.js`, `src/pages/PatientDashboard.js`, `src/pages/ManagerDashboard.js`
Gateway mapping: check `ocelot.json` for `/invoices` upstream mapping (not present in scanned portion) — if missing, gateway will return route-not-found.

---

## src/services/warehouseService.js
- GET /warehouse/equipment
- GET /warehouse/equipment/{id}
- POST /warehouse/equipment
- PUT /warehouse/equipment/{id}
- DELETE /warehouse/equipment/{id}
- GET /warehouse/reagents
- GET /warehouse/reagents/{id}
- POST /warehouse/reagents
- PUT /warehouse/reagents/{id}
- PATCH /warehouse/reagents/{id}/subtract

Files: `src/services/warehouseService.js`
Gateway mapping: verify `/warehouse` upstream exists in `ocelot.json` if used in production

---

## src/services/userManagementService.js
- GET /users
- GET /users?role={role}
- GET /users/{id}
- POST /users
- PUT /users/{id}
- DELETE /users/{id}
- PATCH /users/{id}

Files: `src/services/userManagementService.js`
Gateway mapping: ensure `/users` is mapped to IAM/admin service if needed

---

## test-api-integration.js (root script)
- GET ${API_BASE_URL}/patient/email/{email}
- POST ${API_BASE_URL}/iam/auth/login
- GET ${API_BASE_URL}/admin/accounts
- GET ${API_BASE_URL}/patient
- GET ${API_BASE_URL}/testorder/appointments

File: `test-api-integration.js` (used for manual integration testing)

---

## Components & pages that call services (indirectly call the above endpoints)
- `src/components/ShiftManagement/ShiftManagement.js` — uses `testOrderService` gateway methods (doctorshift endpoints)
- `src/pages/SampleManagement.js`, `src/pages/Results.js` — use `sampleService` and `testOrderService` endpoints
- `src/contexts/AuthContext.js` — after login uses `patientService.getPatientProfileByEmail` to call `/patient/email/{email}`

---

## Recommended next actions
1. Normalize `/gateway` usage:
   - Option A: keep base URL = `https://localhost:7000` and call `/gateway/...` in code when needed.
   - Option B (preferred): keep base URL = `https://localhost:7000/gateway` (as current) and remove literal `/gateway/` from service calls that include it (e.g., change `/gateway/testorder/...` → `/testorder/...`). This avoids double `/gateway` issues.

2. Verify gateway `ocelot.json` contains upstream mappings for `/invoices` and any other endpoints you rely on; if not, add or create wildcard mappings.

3. If you want, I can produce a machine-readable CSV/JSON or normalize code to one convention (I can prepare a PR). Tell me which format you prefer or whether to proceed with normalization.

---

If you want this exported in a different format (CSV/JSON) or want me to automatically apply the normalization change across `src/services/*.js`, tell me and I'll proceed.
