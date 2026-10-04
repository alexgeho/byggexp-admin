# Plan — ByggExp Egenkontroll (AI) + tariff «Egenkontroll»

Goal: a cut-down ByggExp where the customer only sees egenkontroll. Upload a contract / arbetsbeskrivning → checkpoints are created; take photos on site → AI proposes «godkänd» + date + photo as proof; a human confirms and signs. Sold as a cheap tariff and upgraded to full ByggExp by switching tariff.

## What already exists (reuse)
- Backend `checklists/` (templates + instances, items `{text, reference, result, comment}`, sign, PDF via Puppeteer). Roles: admins only.
- Module visibility: `company/modules.ts` `PLAN_MODULES` + `moduleOverrides`; admin `ModuleGuard` + sidebar filter. Mobile: **no** plan/module logic.
- Self-serve signup `/register` → `POST /auth/register-company` → 14-day trial, `plan=null` (= all modules).
- Stripe checkout per plan (`billing/plans.ts`, prices from env).
- Claude vision via raw fetch in `scanning/` (PDF + image blocks, HEIC→JPEG).
- Uploads to local disk `./uploads/<folder>`.

## Phase 1 — AI core (backend + admin) → demo-ready
Backend
1. `common/anthropic.client.ts` — one shared Claude call helper (key, model from env `EGENKONTROLL_MODEL`, PDF/image blocks, JSON parse). New code uses it; old services untouched.
2. Checklist item: add `date`, `photos[{url, takenAt, lat, lng}]`, `suggestion{result, date, photoUrl, reason, confidence, state: pending|accepted|rejected}`. Checklist: `sourceDocument{url, name}`.
3. `POST /checklists/draft-from-document` (PDF/image/text) → Claude → proposed title + items with method/reference. Nothing saved until the user confirms.
4. `POST /checklists/:id/photos` (multi-upload, folder `checklist-photos`, EXIF date/GPS via `exifr`) → Claude matches photos to open items → `suggestion` per item.
5. `POST /checklists/:id/items/:i/accept|reject` — accept copies suggestion → `result/date/photos`.
6. PDF: per-item date + photo thumbnails.
7. Tests: response parsing + matching.

Admin (`src/features/kma/`)
- «Skapa från avtal» = drop zone on KMA page → editable item list → Spara.
- Fill form: per item photos, date, AI chip «Föreslagen: godkänd» with Godkänn / Avvisa; drop zone «Lägg till foton».
- EN/SV/NB strings; badges per status etalon; primary button top-right.

Demo seed: project + contract + 6–10 photos + checklist with suggestions.

## Phase 2 — tariff «Egenkontroll»
- `plans.ts`: plan `egenkontroll` (max users TBD), Stripe prices `STRIPE_PRICE_EGENKONTROLL_*` (owner creates prices in Stripe).
- `PLAN_MODULES.egenkontroll` = core + `projects` + `kma`.
- Signup: `/register?plan=egenkontroll` → trial starts with `plan='egenkontroll'` (not null), tailored copy.
- Admin start page: plan egenkontroll → `/company/kma` (via `getRedirectPathForUser` / `/company` redirect).
- Billing page shows the plan + «Uppgradera till fullständig ByggExp».

## Phase 3 — mobile (OTA only, runtime 1.1.0, no new native modules)
- Read `GET /company/:id/modules`, hide home buttons for disabled modules (fixes general gap too).
- Plan egenkontroll → home = Egenkontroll list.
- Screens: list → checklist (items, suggestions Godkänn/Avvisa) → «Fota» (`expo-image-picker` with `exif:true` + `expo-location`) → upload.
- Allow workers to upload photos to a checklist (backend role change for that endpoint only).
- Test in iOS simulator, then `eas update --branch production` (owner approves publish).

## Phase 4 — site
- Banner (variant A, site colours) on egenkontroll pages: feature exists → «Prova gratis» (`/register?plan=egenkontroll`) + «Boka demo».

## Open decisions (owner)
1. Price per month (suggest 149 SEK) and max users (suggest 3).
2. AI model: Haiku 4.5 (cheap) vs Sonnet 5.5 (more accurate on photos) — suggest Sonnet for photos, Haiku for contract parsing; env-configurable.
3. Can workers upload photos (suggest yes) — signing stays admin-only.
