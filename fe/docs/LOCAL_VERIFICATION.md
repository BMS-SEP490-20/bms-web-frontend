Local verification — Lab result approval and email notification
-------------------------------------------------------------

This checklist helps you verify locally that the doctor approval → email notification flow works.

Prerequisites
- Node.js + npm installed
- Backend APIs reachable (or expect email payloads to be logged to console if `/emails` missing)

Environment
- Set API base (optional):

```pwsh
# Windows PowerShell (pwsh)
$env:REACT_APP_API_BASE_URL = 'https://your-api-host'
npm install
npm start
```

Running the app
1. Start the dev server:

```pwsh
npm start
```

2. Open the app in the browser (usually `http://localhost:3000`).

Test steps — Doctor approves a lab result and email is sent
1. Log in as a doctor account (an account with doctor role and a pending lab test assigned).
2. Navigate to `Duyệt kết quả xét nghiệm` (Doctor lab results page).
3. Select a pending test and click `Duyệt`.
4. Fill the required field `Chẩn đoán xác định` with a non-empty diagnosis.
5. Click `Xác nhận Duyệt`. A confirmation modal will appear — check the diagnosis text preview.
6. Confirm the approval.

Verify email payload
- If your backend exposes `POST /emails`, inspect its logs or the DB to confirm the sent payload includes `to`, `subject`, and `body` (HTML). The email `body` should include the doctor's diagnosis and doctor's name.
- If no backend email endpoint exists, the frontend will `console.log` the fallback payload. Open DevTools Console and search for `Email result notification (fallback)`.

What to check in the payload
- `to`: patient email
- `subject`: contains test id/code and test name
- `body`: contains HTML with patient name (if available), test name, performed date, diagnosis block, and a link to view details (`/patient/results/:id`)

Troubleshooting
- If approval fails with backend validation errors, check the network tab for the PATCH to `/gateway/patients/lab-tests/{id}` and inspect the error body.
- If email body misses doctor's name, ensure the approved labTest returned by the API includes `doctorName` or `approvedBy`.

Optional checks
- Check UI notifications (toasts) for success/failure messages after approval and email send.
