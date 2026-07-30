# Certifikat (employee certificates) — backend spec

The admin frontend for employee certificates is done. It reads `user.certificates`
and drives all CRUD + reminders from it. This document is what the **backend** needs
to add so it persists and so the reminders can also fire outside the app (push/email).

Until these endpoints exist the UI degrades gracefully: the Certificates tab shows
"No certificates", saving shows an error toast, and the list/Att-göra badges stay empty.

---

## 1. Data model

Add a `certificates` array to the **User** schema (embedded subdocuments — a cert has
no life of its own outside its user).

```js
// User.certificates[]
{
  _id:        ObjectId,   // generated
  name:       String,     // required — e.g. "Heta arbeten", "ID06"
  number:     String,     // optional — certificate/licence number
  issuer:     String,     // optional — issuing body
  issuedAt:   Date,       // optional — YYYY-MM-DD from the client
  expiresAt:  Date,       // required — YYYY-MM-DD from the client
  fileUrl:    String,     // optional — link/attachment
  notes:      String,     // optional
  createdAt:  Date,
  updatedAt:  Date,
}
```

Dates arrive from the client as `YYYY-MM-DD` strings — store as `Date`.

**Important:** include `certificates` in the payloads the frontend already consumes:
- `GET /users` (list) — needed for the list badge and the "Att göra" reminder scan.
- `GET /users/:id/detail` — needed for the Certificates tab.

Scope every read/write to the caller's company, same as the rest of `/users`.

---

## 2. Endpoints

All under the existing users controller, `superadmin` + `companyAdmin` only for writes
(matches the RoleBasedAccess guard in the UI).

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/users/:id/certificates` | cert fields (no `_id`) | created cert (or updated user) |
| `PUT`  | `/users/:id/certificates/:certId` | cert fields | updated cert |
| `DELETE` | `/users/:id/certificates/:certId` | — | 204 / `{ ok: true }` |
| `POST` | `/users/:id/certificates/upload` | `multipart/form-data`, field `file` (image/PDF) | `{ fileUrl }` |
| `POST` | `/users/:id/certificates/scan` | `multipart/form-data`, field `file` (image/PDF) | `{ fileUrl, name, number, issuer, issuedAt, expiresAt }` |

**Scan-first flow (the primary UX).** The certificate is photographed; the same
image is both stored as the document **and** OCR'd for the dates. So the frontend
sends the picked file to **one** endpoint:

- If OCR is on (`GET /scan/status` → `{ enabled: true }`, the existing check), it hits
  `/users/:id/certificates/scan`, which stores the file and runs the same Claude-vision
  OCR already used for receipts/invoices — but with a **certificate** prompt that
  extracts `name, number, issuer, issuedAt, expiresAt` (dates as `YYYY-MM-DD`, omit
  what can't be read). Returns `{ fileUrl, ...fields }`.
- If OCR is off, it hits `/users/:id/certificates/upload`, which only stores the file
  and returns `{ fileUrl }`.

The frontend pre-fills the form from the scan, flags any **unread required field**
(name, expiresAt) with a "please fill in" warning, then saves `fileUrl` + fields as
the cert. The file is per-user (not tied to a cert id), so it works for brand-new certs.

`/scan/status` and the Claude-vision pipeline already exist — the certificate work is a
new prompt/parser branch on the existing `/scan` machinery plus these two thin routes.
OCR needs `ANTHROPIC_API_KEY` (see the pending-activations list); until then the UI
falls back to plain upload + manual entry, no errors.

Validation: `name` and `expiresAt` required; reject `expiresAt` that fails to parse.
Return `4xx` with `{ message }` — the UI surfaces `error.response.data.message`.

The frontend does not depend on the exact response shape of POST/PUT; it re-fetches the
user detail after every mutation. Returning the updated cert or the whole user is both fine.

---

## 3. Status logic (mirror of the frontend)

The frontend classifies each cert (see `src/features/users/certificates/certificateStatus.js`).
The backend reminder job must use the **same thresholds** so in-app and push/email agree:

- `expired`  — `expiresAt` is before today (local midnight).
- `expiring` — `expiresAt` is within `WARNING_DAYS` (default **30**) of today.
- `valid`    — further out.
- `unknown`  — no `expiresAt` (should not happen; it's required).

Make `WARNING_DAYS` an env/company setting if you want it tunable.

---

## 4. Reminder job (push + email)

A daily cron (the app already runs scheduled jobs on the VPS/PM2 host) that:

1. Scans all users' `certificates`.
2. Picks certs that are `expired` or `expiring` (≤ `WARNING_DAYS`).
3. Sends a reminder to the company admin(s) — and optionally to the certificate holder.

Suggested cadence to avoid spamming: notify at **30, 14, 7, 1 days before** expiry and
**on/after** the expiry date. De-dupe with a `lastRemindedAt` / `lastRemindedDayBucket`
field on the cert so the same milestone isn't sent twice.

Channels — reuse what already exists:
- **Push:** the Expo push pipeline used by `/notifications/users/:id/test`.
- **Email:** the SMTP path (note: SMTP is not yet configured in prod — see the
  "Pending activations" list).

Message example:
> "Alexander Ljungström — certifikatet *Heta arbeten* går ut om 7 dagar (2026-08-06)."

---

## 5. Frontend touchpoints (already built, for reference)

- `src/features/users/certificates/certificateStatus.js` — status/severity helpers.
- `src/features/users/certificates/CertificatesPanel.jsx` — Certificates tab + CRUD.
- `src/features/users/certificates/CertificateForm.jsx` — add/edit modal form.
- `UserDetailPage.jsx` — Certificates tab + header badge.
- `UserListPage.jsx` — certificate status column.
- `store/approvalsStore.js` + `ApprovalsPage.jsx` + `ApprovalsButton.jsx` —
  expiring/expired certs surface in the "Att göra" centre and its badge count.
