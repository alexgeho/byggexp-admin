# Dev worklog — byggexp-admin (+ ByggExp-BackEnd)

Running log of work + next steps, so a new session can continue instead of restarting.
Repos: `byggexp-admin` (Next.js admin) and `ByggExp-BackEnd` (NestJS). Both auto-deploy on push to `main` (VPS/PM2). Prod = admin.byggexp.se.

---

## ▶ RESUME HERE — state as of 2026-09-05 (read this first)

**2026-09-05 session (all pushed to `main`, auto-deployed; every step `next build`-green + eslint-clean):**

- **Language labels → Swedish exonyms**, order = **Svenska, Engelska, Polska first (most-used by workers)**, then Estniska, Finska, Lettiska, Litauiska, Norska, Ryska, **Bosniska/Kroatiska/Serbiska (after Ryska)**, Ukrainska. Both the header language switcher (`DashboardHeader.jsx`) and the invite/Add-worker form (`UserCreateForm.jsx` `LANGUAGE_OPTIONS`). Renamed endonyms → Swedish (Russkij→**Ryska**, Suomi→Finska, Eesti→Estniska, Latviešu→Lettiska, Lietuvių→Litauiska, Polski→Polska, Norsk→Norska, English→Engelska). Svenska stays förvald (default value `'sv'`).
- **Onboarding wizard: `done` is backend-state driven (self-updating), NOT a remembered click.** Two iterations: (1) first tried a persisted per-company `wizardDone` localStorage flag so seed/demo data wouldn't auto-complete a step — but that flag went *stale*: after creating then deleting a project/worker, the wizard still showed 2/4 while the backend + dashboard checklist correctly showed 0/4. User: "он должен на бэк смотреть и обновлять". (2) **Reverted the flag entirely.** `done` now comes from live counts again (`buildOnboardingSteps`): project/team from the dashboard stores (`projects`/`users` props), the rest from the wizard's own `refetch()` (clients/offers/invoices/articles/tasks/tools + company). So deletions un-complete a step and the wizard always matches the checklist. Old `byggexp-onboarding-wizard-done:*` localStorage keys are now ignored (harmless orphans). NOTE: `team` done = `teamCount > 1` (excludes the admin); a *demo/seed worker* still counts as a team member — if that's unwanted, delete the demo user (which the user did) or we later exclude seed users explicitly.
- **Dark-mode polish on the project create/edit form + wizard:** (1) the "Use location as name" **Switch was invisible** in dark mode — the pill styling was only scoped to `.admin-create-form` but this form is `.admin-modal-form`; extended the switch styling to `.admin-modal-form` in `_forms.scss` and added a visible off-track `#47566d` in `_dark.scss`. (2) **Stray "‖" (two vertical bars)** at the left of empty multi-selects (Сотрудники/Инструменты) — REAL root cause found by live DOM inspection (via an authed MCP tab on prod): the ui-kit `ui-select` (a customized antd, classes `ant-select-content-item` not the standard `selection-*`) applies a chip border (`Select.scss:111` `.ant-select-content-item { border:1px; background:white }`) that also matches the empty **structural** slots `.ant-select-content-item-prefix/-suffix`; empty, they collapse to ~2px and show their left+right border as a "‖". Fix in `src/ui-kit/Select/Select.scss`: reset `-prefix`/`-suffix` to `border:none; background:transparent; padding:0`. Verified live (border 0, bg transparent). Fixes it in ALL forms, not just the project one. (Earlier caret-color guesses targeted a class that doesn't exist in this custom select — reverted.) (3) **Wizard done-marks restyled** to green circle badges with a check symbol (`__rail-check`: light-green circle in light, `rgba(34,197,94,.16)` in dark) instead of the flat filled check, per user's reference image.
- **Project form: Work-day start/end times no longer required** — removed the `required` rules on `workDayStartTime`/`workDayEndTime` in `ProjectCreateForm.jsx` (`Shift schedule` section). Submit already uses `values.workDayStartTime?.format('HH:mm')` (optional), and initial values still default to 07:00/16:00, so clearing them is safe.
- **Enter now advances the project-create wizard.** The primary button is `htmlType="button"` (so step-advancing doesn't auto-submit), and with multiple fields the browser did no implicit submit on Enter → Enter did nothing. Added an `onKeyDown` on the `Form` that calls `form.submit()` on Enter in plain text/number inputs (advances a step, or creates on the last), while ignoring TEXTAREA/BUTTON and anything inside `.ant-select`/`.ant-picker` so their native Enter (pick option / date) still works.
- **Clearing the work-day time now actually persists as "no schedule".** Bug: clearing the time + saving reverted to 07:00 because both the load mapping (`schedule.workDayStartTime || '07:00'`) and `buildShiftSchedulePayload` (`|| '07:00'`) coerced empty → 07:00. Fix (frontend-only — the backend already treats `enabled:false` as no-window in `shift-schedule.util.ts:getShiftScheduleWindow`, and `ShiftScheduleDto` allows omitted times): `buildShiftSchedulePayload` now sets `enabled = enabled && both-times-present` and OMITS empty times (never sends `''`, which the API's HH:mm `@Matches` would reject); `ProjectCreateForm` load shows blank time fields when `!schedule.enabled`. New projects still default to 07:00–16:00 (enabled). Such a project has no planned baseline on the Hours grid (GPS/manual only). Updated `shiftSchedule.test.js` (4 pass).
- **Invite-form only: added Spanska (es) / Portugisiska (pt) / Franska (fr)** after Ukrainska in `LANGUAGE_OPTIONS`. ⚠️ No app dictionaries for es/pt/fr yet → those workers get the English fallback UI (`t()` returns source string). NOT added to the header switcher because unsupported langs aren't in `SUPPORTED_LANGS` (`LanguageProvider`) so a header selection wouldn't persist. TODO if wanted: add es/pt/fr dictionaries + antd locales + SUPPORTED_LANGS entries, then surface them in the header too.
- **Removed the "An invitation email will be sent to the address above." helper note** on the Create user → step 3 (Details) — dropped the `invite-note` block + now-unused `MailOutlined` import in `src/features/users/components/UserCreateForm.jsx`. (Translation keys left in `messages/*.js`, harmless.)

- **i18n refactor:** the 3474-line `src/i18n/messages.js` split into per-language modules `src/i18n/messages/{sv,nb}.js`; `messages.js` is now a thin index re-exporting `dictionaries`. Public API unchanged (only `LanguageProvider` imports it); dictionaries byte-identical; dropped a pre-existing duplicate `Details` key. **Add new translations in `messages/sv.js` + `messages/nb.js` now — every user-facing string in BOTH.**
- **Onboarding deep-link bug fixed:** `task` + `tools` steps link to `?create=1` but `useAutoOpenCreate` was only wired on projects/users/clients/offers/articles → they dead-ended on an empty list. Added the hook to `TaskListPage` + `ToolListPage`. Renamed step "Assign a task" → "Create a task".
- **NEW: full-screen onboarding wizard gate** — `src/features/onboarding/OnboardingWizard.jsx` + `.scss` (client/instructor feedback: walk new companies through setup one action at a time BEFORE the dashboard). Shown to a companyAdmin while onboarding view==='open'. Flow: routing question (crews vs invoicing) → left step-rail + right stage → per-step create opens the SAME `AdminModal`+form the list page uses (no navigation) → auto-advance on create → track hand-off → completion. Shares view/focus with the dashboard checklist via `src/features/onboarding/onboardingStorage.js` change-event (no double UI). Steps unified into `activation.buildOnboardingSteps` (single source for checklist + wizard). z-index **900** (above chrome, below antd modals so create modals + nested "+ New…" render on top). Mounted in `DashboardPage` alongside the checklist.
  - **Polish applied this session:** progress ring lowered so it clears "Skip for now"; "Skip for now" font 14.5px; **backdrop click** collapses the gate to the Resume bar (recoverable); removed the redundant bottom "Skip" (kept top-right only); heading "Get started with crews & jobs" → **"…crews & project"**; clearer routing hints ("Create a project, add your team, and track their hours and tasks." / "Set up your company and clients, then send offers and invoices.").
- **Company-details step now opens IN-PLACE** (was navigating to the full `/company/profile`, showing irrelevant "Your information" + "Reminders" and never returning — flagged by Наталья "1 экран — одно действие"). Extracted the company sender-details form into reusable **`src/features/profile/CompanyDetailsForm.jsx`** (logo + fields + save); `ProfilePage` renders it, and the wizard opens it as a focused modal step. Only `billing` (full-page offer builder) still navigates. Also **Address is no longer required** (dropped rule + red asterisk).
- **Swedish is now the default language** (Swedish-first product): `LanguageProvider` defaults to `'sv'` on a fresh browser (a stored `admin-lang` choice still wins). Also **localized the invite/"Set up your company" page** — its strings were hardcoded English; wrapped in `t()` + added SV/NB.

### NEXT STEPS — onboarding wizard (pick up here)
1. **Verify live** on admin.byggexp.se with a fresh company (private window): invite page is Swedish; wizard routing → **each step opens a modal in place** (project → team → task → tools → company → client → article), auto-advances on create, `billing` navigates to the offer builder; hand-off between tracks; **backdrop click / "Skip for now"** → Resume bar; nested "+ New client/worker" inside the project form renders on top of the gate.
2. **Per-step short instructions / demo** (Наталья: «для каждой ещё инструкцию» + «демо видео если хочешь — тоже супер»). Could add a small help blurb or looping GIF/video per stage in the wizard right panel.
3. **`billing` step still leaves the wizard** (full-page `OfferCreatePage`). Options: a lighter "first invoice/offer" modal, or accept the navigation (it's the last step).
4. **Optional:** group the skip-track (focus='skip', all 8 steps) under Operations / Get-paid subheads; refresh `docs/research/onboarding-benchmark.md` with the wizard-gate design.
5. Older idea still open: safe client-side **demo/preview** data so the empty product looks fuller (vs a DB seed).

### Carry-over (still open from 2026-09-04, unchanged)
- **Solo/lite variant** analysis (memory `[[project_solo_lite_variant]]`); **Invite language** picker (`[[project_invite_language]]`); **GPS Approach B** (deferred, privacy); **RealMar AB** as App Store publisher (user-side).

---

## ▶ RESUME HERE — state as of 2026-09-04

**All work below is committed & pushed to `main` on both repos (auto-deployed).** Full detail is in the dated sessions further down; this is the short map.

### Done in the 2026-09-04 run (sessions b–j)
- **Onboarding tracks now split by purpose** (session j): fieldwork = project→team→task→tools (operations), billing = company→client→article→offer/invoice, with a prominent hand-off card between them. Create-project wizard + inline "+ New worker"; many wizard/create fixes; self-delete blocked; `?create=1` no longer re-opens (verified live). See session (j) below for detail.
- **Onboarding = 100% best-practice.** Attention hierarchy (one "START HERE" active step + primary CTA, others muted); routing question ("What matters most right now?") shown as the header subtitle with two accent, non-bold, box-less choice buttons that are the focal point while the steps stay muted until a choice is made — using the app's **brand blue `#2683f9`/`#1971e0`** (`$color-button-primary`); completion celebration ("You're all set! 🎉"); **server-persisted** focus+view on the Company doc (localStorage = cache); training videos (7 real app videos for workers).
- **Superadmin onboarding funnel UI** — `/admin/analytics/onboarding` (sidebar System → Onboarding funnel) over `GET /analytics/onboarding/funnel`.
- **Create-project wizard** (3 steps) — same recipe as employee/client wizards.
- **Live Site map (Approach A, privacy-safe)** — `/company/map` + `/admin/map` (sidebar Production → Site map). Leaflet+OSM, pin per project with a live on-site worker count from `workStatus`; **no coordinate storage**. `map` now a registered module (visible to all companies).
- **Wizard draft persistence** — `useWizardDraft` hook: employee + client create-wizards keep values+step in localStorage; restore on reopen, clear on submit/Cancel.
- **i18n cleanup** (Swedish words out of English source strings); **header theme icon** hollow + 20px.

### 🎉 Milestone — iOS app is LIVE on the App Store (2026-09-04)
ByggExp is published and downloadable (App Store search, category Näringsliv, publisher Alexander Gerhard). The earlier "verify App Store go-live" item is DONE. Workers can install from the store; GPS Approach A works with it. Approach B remains gated only on the legal/privacy decision, not the store.

### NEXT STEPS (pick up here)
1. **Verify live** on admin.byggexp.se the 2026-09-04 (j) batch: onboarding **track split** (Manage projects or crews = project→team→task→tools; then hand-off card → billing = company→client→article→offer/invoice; both tracks done ⇒ celebration); create-project wizard end-to-end (name/status reach backend; inline **+ New worker** adds the invited worker to the team AND they now appear on it); **self-delete blocked** on Staff; `?create=1` no longer re-opens the create modal (VERIFIED live already); primary action pinned top of wizards, no Back.
2. **Onboarding polish (optional):** group the **skip** track (all 8 steps flat) under "Operations"/"Get paid" subheadings; refresh `docs/research/onboarding-benchmark.md` to record the track split; safe client-side **demo/preview** instead of DB seed if the empty product should look fuller.
3. **Solo/lite variant** — user's "на подумать" analysis task: clone/simplify ByggExp for solo/tiny companies (invoicing + time-management + productivity/health). Analysis doc in `docs/research/` first. Memory `[[project_solo_lite_variant]]`. Likely mechanism = a "Solo" module-visibility preset (`ByggExp-BackEnd/src/company/modules.ts`).
4. **Invite language** — idea only (memory `[[project_invite_language]]`): pick invitee language at invite → email/page + app default to it; dep = app needs PL/RU translations.
5. **Wizard draft for ProjectCreateForm** — excluded (dayjs pickers not JSON-serialisable); add dayjs↔ISO (de)serialisation to `useWizardDraft` if wanted.
6. **GPS Approach B (exact in/out pins)** — DEFERRED by user (privacy-policy + consent). Approach A shipped. Memory `[[project_gps_live_map]]`.
7. **RealMar AB as App Store publisher** — account is **Individual** (Team ID 33667XUA76). To show RealMar AB: convert Individual→Organization via Apple Developer Support (needs D-U-N-S) OR App Transfer to a RealMar org account. User-side; can't be scripted.

### Deferred / not doing (with reason)
- **Demo-seed "Пример проект"** — marginal (empty states cover it) + DB/company-scoping risk.
- **Server-side wizard drafts** — chose local persistence instead (no half-filled DB rows).
- Personal activation checklist (rotate keys, SMTP in prod, inbound email) — config/secrets, memory `[[project_pending_activations]]`.

---

## Session 2026-09-04 (j) — wizard hardening, create-project polish, onboarding track split

Big batch of live-driven fixes (all pushed; several verified in the browser).

**Onboarding tracks reworked (user: clients/company are billing, not fieldwork):**
- `activation.js` foci: **fieldwork** = `['project','team','task','tools']` (operations only), **billing** = `['company','client','article','billing']`. Added two new checklist steps **task** (`/company/tasks?create=1`, done when `/tasks` count>0, copy sells auto-reminders) and **tools** (`/company/tools?create=1`, done when `/tools`>0). Counts fetched in `OnboardingChecklist`.
- When a track's steps are all done, a prominent **hand-off card** (`.onboarding__handoff`) appears ("Your crew is up and running 🎉 → Send an invoice or offer") instead of the checklist vanishing. Full celebrate/hide only when **every step across both tracks** is done (`allStepsDone` from the base list; `trackDone` drives the hand-off). Tests updated (8 pass). SV+NB + light/dark styles.

**Create-project wizard:**
- Rolled the 3-step wizard onto create-project (Basics → Team & client → Schedule & budget); edit stays single form.
- Inline **+ New worker** on the Team step (minimal email+role form, `UserCreateForm minimal` prop) invites a worker and auto-adds them to the team.
- **BACKEND fix** (`projects.service.create`): workers were saved to `project.workers` but never got `user.projectIds`, so they didn't show on the team (`findAllByProject` queries by `projectIds`). Now create loops workers through `addUserToProject` like admins.
- **Wizard submit fixes:** `onFinish` now merges `form.getFieldsValue(true)` so fields from earlier (unmounted) steps (name/status/team) reach the payload — fixed "name should not be empty" / "Invalid project status". Status defaults to `planning` if missing.
- **Auto-submit fix:** the Next↔Create button swap let the same click's mouseup hit the freshly-rendered submit button and auto-create on the last step. Now **one stable `htmlType="button"`** primary that calls `form.submit()`; `onFinish` decides advance vs create. Applied to all 3 wizards.
- **Nav moved to top:** primary action sits on the step-tabs row (pinned), **Back removed** (go back via step tabs, close via modal ×). `.admin-modal-form__wizard-top` sticky-top. (Earlier sticky-bottom attempt hid the button under `overflow:auto` — reverted.)
- Removed **Contract No.** field; **Littera / order no. → "Order no."**.

**Removed a data leak:** `ProjectOverviewTab` had a hardcoded **mock "Tasks & deadlines"** fallback (Casting foundation slab…) shown to real customers when a project had no tasks — deleted; shows real tasks or empty state.

**Self-delete blocked:** BE `assertCanDeleteUser` rejects actor===target; FE Staff hides the row's Delete + disables its checkbox + skips self in bulk. SV+NB.

**Tables:** shared `BulkDeleteButton` (was ui-kit solid vs antd outlined — now identical everywhere); toolbar reordered so **search stays fixed** and bulk buttons appear to its left; **Email column widened** (320px). **Role next to Email** on the user form (defaults Worker) so minimum to invite = just email; first-employee-only guided wizard (session i).

**`?create=1` fix (VERIFIED live):** `useAutoOpenCreate` opened the modal on `?create=1` but left the param, so re-clicking Projects reopened it. Now strips it via `window.history.replaceState` right after firing (router.replace was unreliable). Confirmed in-browser: deep-link opens once + URL cleans; sidebar Projects → list only.

---

## Session 2026-09-04 (i) — guided wizard only for the FIRST employee

- **Create-user wizard is now first-run only.** UserListPage computes `firstUser = users.length <= 1` (only the admin) and passes `guided={firstUser}` to `UserCreateForm`. New `useWizard = isCreate && guided`: when guided, the 3-step wizard; otherwise the **plain single form** (same as edit — faster for experienced admins). The modal footer follows: `footer={editingUser || !firstUser ? undefined : null}` (built-in Cancel/Save shown for edit + single-create; hidden only for the wizard). `onFinish` advance now gated on `useWizard`, and the single-form branch is `if (!useWizard)`. `guided` defaults true so other callers are unchanged (ProjectTeamTab keeps the wizard; UserDetailPage is edit).
- **Not yet applied to client/project create** — same pattern could gate those to first-run too if wanted (they'd need a "first client/project" signal on their list pages).

---

## Session 2026-09-04 (h) — module 'map' registered + wizard draft persistence

- **Invite-vs-create fork: dropped** — create already always emails (`UserCreateForm` `inviteViaEmail=true` unconditional + bulk import). Nothing to build; unified as the user wanted.
- **Site map visible to companies (`map` module)** — the nav key wasn't in CORE/TOGGLEABLE, so the frontend module filter hid it for every company admin (only superadmin saw it). BE `company/modules.ts`: added `map` to `TOGGLEABLE_MODULES` + `START` preset (→ tillvaxt → professionell → all plans + no-plan include it). FE `shared/config/modules.js`: `map`→'Site map' label + Production group so it appears as a toggle in Customize-menu. "Give all functions for now" ✔, still hideable later.
- **Wizard draft persistence (#3, local approach)** — new `src/shared/hooks/useWizardDraft.js`: saves a create-wizard's values+step to localStorage as you go, restores on reopen, clears on successful submit + explicit Cancel (modal-X preserves). A `readyRef` gate blocks saves until the initial restore runs so form-init defaults can't clobber the draft. Wired into **UserCreateForm** (`byggexp.wizard.user`) + **ClientCreateForm** (`byggexp.wizard.client`). **Chose local over server-side drafts** — no half-filled user/project rows polluting the DB; same-browser "come back and it's there" is met. **ProjectCreateForm excluded** (dayjs TimePicker/DatePicker need custom (de)serialisation — do later if wanted). Requires the hook to be declared AFTER each form's init effect so restore runs after reset/defaults.

---

## Session 2026-09-04 (g) — Routing choice = prominent first step (REVERTED)

⚠️ **Reverted** (commit `89b1a49`) — user found the big cards added too many headers/visual clutter ("чета заголовков перебор стало"). Routing is back to the compact pills and the step list shows immediately again. Below is what was tried, for reference if revisited (keep it lighter next time — maybe just slightly bigger pills, no hidden steps):

User: the two "What matters most right now?" options must be the priority — the first thing the person sees and picks. Were flat secondary pills. Tried:
- `OnboardingChecklist`: `FOCUS_OPTIONS` gained `desc` + `icon` (Team/FileText). When `focus === null` the routing block renders two prominent **choice cards** (`.onboarding__focus-card`: icon tile + title + subtitle + arrow, 2-col→1-col@640), and the **step `<ol>` + next-focus link are hidden** (`{focus !== null ? … : null}`) so the choice is unmissable. Skip still sets `focus='skip'` → all steps in default order.
- SCSS: replaced `.onboarding__routing-opt/-opts` with `.onboarding__routing-cards/.onboarding__focus-*`; `_dark.scss` updated to the new classes. 2 new subtitle strings SV+NB.

---

## Session 2026-09-04 (f) — Onboarding to 100% best-practice

- **Server-persist onboarding (G5)** — was per-browser localStorage. **BE** (ByggExp-BackEnd): `OnboardingState {focus,view}` sub-doc on Company + `company.service.setOnboarding` + `PATCH /company/:id/onboarding` (own-company guard; `/company/my` already returns it). **FE**: `OnboardingChecklist` now `persistOnboarding()` on setView/chooseFocus/resetFocus and `reconcileOnboarding(co.onboarding)` once on load — **server wins when it has data** (choice follows the account across devices), else local state migrates up; localStorage stays the instant cache + offline fallback. Step *completion* is still derived live from real data — only the 2 UI choices persist.
- **Completion celebration** — instead of the checklist silently returning null when all steps done, a green "You're all set! 🎉" card with a Done button (hides it). Guarded by a `celebrate` state set only when the LAST step flips to done in-session, so an already-set-up company never sees it. SCSS `.onboarding--done` (+ `_dark.scss`).
- Onboarding gap table now: G1✅ G2✅ **G5✅ G6✅** G4✅ G7✅; only **G3 demo-seed** left (deliberately marginal — empty states cover it, + DB/company-scoping risk).
- **NEXT (user-requested, separate task — "на подумать"):** analyze how to CLONE/simplify the product into a lighter variant for very small companies / solo entrepreneurs (1 person), shifting emphasis onto invoicing + time-management + a productivity/health focus. Saved as memory [[project_solo_lite_variant]]. Not started — it's an analysis/design task.

---

## Session 2026-09-04 (e) — Help videos, i18n cleanup, live Site map

Cleared the rest of the onboarding + backlog items in one pass.
- **Help/onboarding discoverability**: "Help" was **already** in the company sidebar (`DashboardSidebar` line ~171) — that backlog item was already done; worklog note was stale. **Training videos**: the 7 published BYGG EXP mobile-app videos now embed in Help → "Watch & learn" for the **worker** audience (`WORKER_VIDEOS`, youtu.be→youtube.com/embed); **admin** audience keeps the 3 dashboard placeholders (not filmed). Real URLs live in `HelpPage.jsx`.
- **i18n leftovers**: removed Swedish words from English source strings (Underentreprenör→Subcontractor, Egenkontroll el→Self-inspection electrical, tillägg/avgående→additions/deductions, förenklad dropped). Renamed the sv/nb keys in `messages.js` (values kept). Kept ÄTA/Skatteverket as domain terms.
- **GPS live map → shipped as Approach A** (user chose it over the coordinate-pin Approach B, which is blocked by our privacy promise + needs a legal/consent decision). Privacy-safe: `src/features/map/SiteMapPage.jsx` (+scss), routes `/company/map` + `/admin/map`, sidebar **Production → Site map**. Leaflet+OSM (existing dep, imperative dynamic import like `ProjectLocationPicker`). Pin per active project with saved coords; badge = live count of users with `workStatus==='working'` && `workStatusProjectId===project`; popup lists names. Side list + no-location group + summary; polls 30s. **No backend, no coordinate storage.** SV+NB, light+dark.
  - ⚠️ `map` is a **new module key** — companies with an explicit module plan won't see the nav entry until `map` is added to their enabled list (fail-open: no-plan + superadmin see it). If it should always show, add `map` to the module presets.
  - Approach B (exact in/out pins) remains available in `[[project_gps_live_map]]` if the legal decision is later made — backend recipe still valid, mobile just needs to send the coord it already computes.

### Next steps (resume)
- [ ] Verify live: `/company/map` + `/admin/map` render, pins + counts sane, dark mode ok. Worker Help videos play.
- [ ] If Site map should show for planned companies → add `map` to module presets (superadmin/backend).
- [ ] Onboarding deferred (unchanged): demo-seed, server-persist progress (both need backend). Approach B GPS pins pending legal call.

---

## Session 2026-09-04 (d) — Onboarding funnel UI (superadmin)

Built the missing UI over the already-live backend endpoint `GET /analytics/onboarding/funnel` (was: endpoint + event collection shipped, no way to see it).
- New page `src/features/analytics/OnboardingFunnelPage.jsx` (+`.scss`), route `app/admin/analytics/onboarding/page.jsx`, sidebar entry **System → Onboarding funnel** (`RiseOutlined`, superadmin-only) in `DashboardSidebar.jsx`.
- Endpoint returns `{ stages: [{event, companies, events}], activatedCompanies }` in fixed order viewed→step_completed→company_activated→completed (distinct-by-company). UI: **hero activation-rate** (activated ÷ viewed) + 4 funnel bars with step-to-step conversion % (green) + event counts. **Activated** row highlighted as the key outcome (same attention-hierarchy accent as the checklist). Empty state + Refresh.
- Self-contained SCSS with its own `[data-theme='dark']` block (palette copied from `_dark.scss`: #131c2b/#1a2536/#24324a/#e6edf6/#93a4bd) — no shared-var import needed.
- All strings SV+NB. `Refresh` already existed (didn't re-add). `sass` compile-check clean, eslint clean.
- **Closes G1/P0 measurement loop** in `docs/research/onboarding-benchmark.md`.

### Next steps (resume)
- [ ] Verify live as superadmin: `/admin/analytics/onboarding` renders + numbers look sane once events exist.
- [ ] Remaining onboarding backlog: **Help in company sidebar** (reopen path still URL-only), training-video URLs, GPS live map (unblocked).

---

## Session 2026-09-04 (c) — Create-project wizard

Rolled the wizard recipe onto the **Create-project** modal (next item from the prev session's backlog). Same 3-piece pattern as employee/client.
- `ProjectCreateForm.jsx`: extracted every `<section>` into a const (`generalSection`, `teamSection`, `scheduleSection`, `datesSection`, `budgetSection`, `noteSection`) + `hiddenFields`. **Edit** = original single full form (also the Settings-tab embed via `showSubmitButton`). **Create** = 3 steps: **Basics** (location, name*, contract, littera) → **Team & client** → **Schedule & budget** (schedule+dates+budget+note). `Next` → `form.submit()`; `onFinish` early-returns `if (isCreate && step < LAST_STEP) setStep+1`. Work-day times are required but pre-filled with defaults, so advancing never blocks on a later-step field. Hidden lat/long/radius stay mounted so the location picker's writes survive step changes. `submitting` on the final button.
- `ProjectListPage.jsx`: `footer={editingProject ? undefined : null}` (hide built-in footer for create only).
- New step labels localized SV+NB (`Basics`/`Team & client`/`Schedule & budget`). Note: `Next`/`Back`/`Cancel`/`Details` already exist in messages.js — don't re-add (no-dupe-keys). ⚠️ Pre-existing dup key `Details` in messages.js (lines ~499/2179 each lang) — not mine, lint flags it.
- **Offer/invoice NOT converted**: they're full-page builders (`OfferListPage` does `navigate('new')` → `OfferCreatePage`), not `AdminModal` forms, so the footer-passthrough recipe doesn't apply. Would need a different (page-level stepper) approach; lower priority since a full page is already a focused flow.

### Next steps (resume)
- [ ] Verify project wizard live on admin.byggexp.se (create vs edit; Settings-tab edit still works via `showSubmitButton`).
- [ ] If offer/invoice wizardization is still wanted → page-level stepper, separate task.
- [ ] Remaining onboarding backlog unchanged: Help in sidebar, funnel UI, training-video URLs, GPS live map (unblocked).

---

## Session 2026-09-04 (b) — onboarding attention hierarchy

Made the "Getting started" checklist guide the eye to **one clear next action** instead of a flat list of equals (visual/attention hierarchy: emphasis + de-emphasis, primary/secondary actions).
- `OnboardingChecklist.jsx`: `activeKey` = first not-done step **in focus order**. That step gets `--active` (tinted card, accent filled dot, **"Start here"** eyebrow, **primary filled CTA**). Other pending steps get `--upcoming` (muted title/desc + `__go--muted` quiet link). Done steps unchanged.
- SCSS in `OnboardingChecklist.scss` (light) + `themes/_dark.scss` (dark). ⚠️ Dark CTA rules use the full selector `.onboarding__step .onboarding__go--primary/--muted` to beat the later generic `.onboarding__go { color:#60a5fa }` (same-specificity, source-order lesson again).
- New string **"Start here"** → SV "Börja här", NB "Start her" in `i18n/messages.js`.
- Commit pushed (auto-deploy). Verify live on the Overview checklist.

---

## Session 2026-09-04

Theme: **step-by-step "wizard" create-forms** (continuing the onboarding segmentation pattern into the actual create modals). Commits: `6d2d2a7` (employee wizard), `a8fd0a3` (docs), `d6faf27` (client wizard + tweaks). All pushed → auto-deploy.

### The reusable wizard pattern (READ THIS to extend to more forms)
To turn any single `AdminModal` create-form into a stepped wizard, 3 pieces:
1. **`AdminModal` `footer` passthrough** (`src/shared/components/AdminModal.jsx`): `undefined` → built-in Cancel/Save; `null` → no footer (the form renders its own nav); node → replace. Already shipped, non-breaking.
2. **List page**: pass `footer={editing ? undefined : null}` so the built-in footer is hidden for **create** only (edit stays a normal single form).
3. **The form component**: extract the field sections into JSX consts, add `const [step,setStep]=useState(0)` + `submitting`, render a ui-kit `Segmented` step indicator (`value=step`, onChange allows **backward** nav only), compose per-step bodies, and an own `.admin-modal-form__wizard-nav` footer with `Button`. **Key trick:** the `Next` button calls `form.submit()`; `onFinish` early-returns `if (isCreate && step < LAST_STEP) { setStep(step+1); return; }` and only runs the real create on the last step. Required fields on early steps are enforced because `form.submit()` validates the whole form. antd `preserve` keeps unmounted step values. `destroyOnHidden` on the modal resets step state on reopen.
SCSS lives in `src/styles/components/_modals.scss`: `.admin-modal-form__steps` / `__wizard-nav` / `__invite-note` (token-based, dark-safe).

### Add-employee wizard (onboarding P1b)
Research pass first (Rippling/Gusto/Personio/BambooHR add-employee flows + NN/g wizards, Miller's/Hick's law, form-abandonment) → grouping *identity → role/access → employment → invite*.
- **`src/features/users/components/UserCreateForm.jsx`** create mode = **3 steps**: `Contact` (email req, name, phone, **role**) → `Access` (projects, tools) → `Details` (profession, rate, personnummer, tax + invite note). Role preselected `worker`. Final submit reuses the **unchanged** create path (`inviteViaEmail=true` + `createUser` + attach tools). Edit mode unchanged.
  - ⚠️ **Role was moved onto step 1** (user: "сразу роль должны быть") — was on the Access step originally. This slightly diverges from the research (role = deliberate step-2 decision) but fits construction (role ≈ always worker, known upfront).

### Add-client wizard
- **`src/features/clients/components/ClientCreateForm.jsx`** create mode = **3 steps**: `Details` (client type + Business/Private identity — companyName* / firstName*+lastName*) → `Address` (address + Contact: email/phone/mobile/website) → `Payment` (terms, currency, discount, rate, reverse-VAT + notes). Final submit reuses existing `createClient`. Edit mode = original single full form. `ClientListPage` hides built-in footer for create. No new i18n needed (Details/Address/Payment already existed).

### Invite page
- **`src/features/auth/InvitePage.jsx`**: "Your name" is **no longer required** on the `/invite?token=…` setup form (user request). Submit already sent `name || undefined`.

### Next steps (resume here)
- [ ] **Roll the wizard to more create-forms if wanted** — best candidates: **create-project** and **create-offer/invoice** (both are checklist steps). Use the 3-piece pattern above. Ask user which before doing all.
- [ ] **Invite-vs-create fork** on the employee wizard's last step ("create account without email" for workers with no email) — needs a backend endpoint (currently always `inviteViaEmail=true`).
- [ ] **Draft-on-open + persist-per-step** (research best-practice: create the record on wizard open, save each step) — currently the record is only created on final submit. Needs backend draft support.
- [ ] **Verify live** on admin.byggexp.se: employee wizard (role now on step 1), client wizard, invite name optional. User was screenshotting these live during the session.
- [ ] Onboarding backlog still open (see `docs/research/onboarding-benchmark.md`): analytics **funnel UI** over `GET /analytics/onboarding/funnel`; add **Help to sidebar**; fill **training-video URLs**; demo-data seed; server-persist onboarding progress.

---

## Session 2026-09-02

### 🎉 Milestone
- **iOS app "ByggExp" APPROVED by Apple** for distribution (App Store Connect email).
  - ⚠️ Before it goes live: check **App Store Connect → Agreements, Tax, and Banking** — the Paid/Free Apps agreement must be **Active** or it won't distribute. Up to 24h to appear after release.
  - This **unblocks the shelved GPS live map** (was shelved *until store approvals*). See Next steps.

### Onboarding (checklist / activation / analytics)
Working design doc: `docs/research/onboarding-benchmark.md`. Live pieces:
- **Activation event** + client analytics: `src/features/onboarding/activation.js` (`isActivated`, `stepsForFocus`, `nextFocus`, `ONBOARDING_FOCI`), `src/shared/analytics.js` (`track`/`trackOnce`). Tests: `activation.test.js` (8 passing).
- **Backend analytics collection** (ByggExp-BackEnd): `src/analytics/` module — `POST /analytics/events` (auth, batched; server stamps user/company/role from JWT) + `GET /analytics/onboarding/funnel` (superadmin). `track()` flushes batches there.
- **Routing question** ("What matters most right now?") → two focus tracks, each shows only its steps + a transition link to the other:
  - `fieldwork`: project → team → client → company (no billing).
  - `billing`: company → **article** → client → offer/invoice.
  - Heading follows focus ("Kom igång med arbetslag & jobb" / "…offerter & fakturor").
  - "Change focus" link reopens the question; "Skip" is a visible link.
- **New checklist step "Add your articles"** (`GET /articles`, deep-links `?create=1` via `useAutoOpenCreate`). Plain-language copy (no "catalog"); desc uses "faktura".
- **Deep-link `?create=1`** opens the create modal on 5 list pages (projects, users, clients, offers, articles) via `src/shared/hooks/useAutoOpenCreate.js`.
- **Collapse-to-Resume bar**: closing the full checklist (×) collapses it to a compact bar on Overview (progress ring + "Resume"); the bar's × hides it for good; everything disappears once all steps done. 3-state `view` = open/collapsed/hidden in localStorage (`byggexp.onboarding.view.<companyId>`; migrates old `dismissed` flag → collapsed). `OnboardingChecklist.jsx` exports `viewKey`.
- **Help page reopen**: `/company/help` (For admins) has "Show it again" (sets view=open). NOTE: **Help is not in the sidebar** — reachable only by URL. Consider adding a nav entry (see Next steps).
- Empty-state CTAs already on 13 lists; tour/welcome-modal remain removed.

### Invite emails localized (ByggExp-BackEnd)
- `src/mail/mail.service.ts`: `sendCompanyInviteEmail` + `sendUserInviteEmail` were hardcoded English → now default **Swedish**, **Norwegian** for `company.country === "NO"`, English fallback. `getRoleLabel` (users.service) now Swedish. Verified live: invite arrived as "Du är inbjuden till ByggExp".

### Hours grid (Arbetspass) — `src/features/shifts/`
- **Reset planned to schedule**: leftover `HourAdjustment` rows were overriding the project schedule (stuck at 8h). Added backend `DELETE /hours/adjustments?projectId&from&to` (`hours.service.resetAdjustments`) + a "Reset" button in the Regler popover (`HoursRulesPopover`, `HoursPage.resetToSchedule`, store `resetAdjustments`). Planned = `workDayEnd − workDayStart` (no hidden lunch); "Obetald lunch" is a client-side net deduction.
- **Cell colour rule** (final): purple by default; **amber only when the worker's MANUAL entry deviates from the plan** (GPS is ignored — it always drifts). Manual is compared to the **net** planned (after unpaid lunch). No-show (planned, nothing logged) = amber "—". `flagOf` in `HoursPage.jsx`.
- **Click-to-edit** keeps the current value (pre-filled + select-on-focus) instead of clearing; same select-on-focus added to the Regler number inputs.

### Schedule / Gantt (Planering) — `src/features/schedule/`, `src/styles/pages/_schedule.scss`
- **Week/day header divider**: react-calendar-timeline cells have no `rct-dateHeader-primary` class, so the divider is on `.rct-calendar-header > div:first-child`.
- **Corner label fixed**: RCT drops the className on `SidebarHeader.getRootProps`, and its span defaulted to **white-on-white** (looked empty). Styled by position (`.rct-header-root > div:first-child`) + dark span; localized "Projekt (N)" / "Personal (N)".

### i18n leak fix — `src/features/projects/components/ProjectCreateForm.jsx`
- English rate labels carried Swedish words. Now: "Cost rate / hour — self-cost (SEK)" and "Bill rate / hour — billed (SEK)"; SV/NB keep domain terms.

### Tables — bulk delete
- `AdminTable` already shows a direct red "Delete (N)" button when `onBulkDelete` is passed (16 lists have it). `UserListPage` was the outlier (hid delete in an "Actions" dropdown) → now shows a direct **Delete (N)** button; add/remove-from-project + resend-invite stay in the "Actions" dropdown.

### Dark mode + UI polish (later in the session)
- **Theme toggle icon**: header lightbulb → **sun/moon** (moon in light → click for dark; sun in dark → click for light), inline SVGs in `DashboardHeader.jsx`.
- **Dark-mode header icons**: theme/language/notifications icons hardcoded a dark navy (`#052d50`) with no dark override → invisible on the dark header. Added `[data-theme='dark'] .dashboard-header__actions .ant-btn { color:$text }`.
- **Dark-mode contrast SWEEP** (systematic): ran a **Workflow** (25 agents, one per component SCSS) to find text hardcoded to dark navy/slate (`#052d50`, `#0b2545`, `#0f172a`, `rgba(5,45,80,…)`) with no `[data-theme='dark']` override → 67 selectors. Added them all to `_dark.scss` (inside the dark scope). Covers: tables (row names, ⋮ action btn, generic antd tbody), forms/inputs/placeholders, location picker, dashboard cards/personnel/activity, project finance/mini-plan, billing, legal, my-work, system-status, invoicing, bemanning/schedule modals. **Excluded `.schedule-page`** — the Gantt keeps a light surface in dark mode, so its dark text is correct.
- **Quiet secondary header button** ("Lägg till flera" / bulk import): was a loud white filled button competing with the primary. Now a **muted filled** button (soft grey `#f1f5f9` + muted text in light; `$surface-2` + `$muted` in dark), fills on hover. Scoped to `.dashboard-page-header__actions` only.
  - ⚠️ **Lesson**: the ui-kit base rule `.ui-button.ui-button--secondary.ant-btn` has specificity (0,3,0). Overrides MUST use the full selector (or higher) or they silently lose — my first attempt at (0,2,0) shipped but was overridden (button stayed white). Diagnose via live DOM inspection (getComputedStyle + scan styleSheets for the rule), don't assume "deploy lag".

### Housekeeping
- **Disk cleanup: ~60G freed** across dev folders + `~/Library` (Next `.next`/Turbopack caches, Gradle/Expo/npm/nuget caches, iOS Pods, Xcode DerivedData, all iOS simulators, Android AVD, `.googleads/venv`, **Claude Desktop `vm_bundles` 12G** — user said Claude Desktop not needed). Kept `node_modules`. To re-run iOS: `cd ios && pod install`.

---

## Next steps / open items

**High-value (unblocked now):**
1. **GPS live map** — un-shelve now iOS is approved. Recipe in memory `[[project_gps_live_map]]`: Nuba-style worker clock-in/out map. Backend changes were reverted (repo was clean); re-add Assignment/location bits + the admin map. Confirm iOS background-location entitlement + the permission flow (the "Allow always" dialog is already shipped in the app).
2. **Verify App Store go-live**: Agreements/Tax/Banking active; then release.

**Onboarding:**
3. **Analytics funnel UI** for superadmin over `GET /analytics/onboarding/funnel` (endpoint exists, no UI yet). Shows companies per stage + activation rate.
4. **Add "Help" to the sidebar** (or a header ? entry) so the reopen path + guides are discoverable (currently URL-only).
5. Fill real **training-video URLs** in `HelpPage.jsx` `TRAINING_VIDEOS` (currently `url: null`).
6. Server-persist onboarding progress (all flags are per-browser localStorage) — needs a backend endpoint.
7. Demo-data seed ("Пример проект") — deferred (DB writes / company-scoping risk).

**i18n cleanup (pending user OK):** remaining Swedish-in-English source strings:
- `e.g. Material, Underentreprenör` → Subcontractor
- `…simplified flat rate (förenklad)…` → drop "(förenklad)"
- `Positive for tillägg, negative for avgående (deduction)` → additions / deductions
- `Deductions (avgående) reduce it` → drop "(avgående)"
- `e.g. Egenkontroll el – vån 2` (placeholder) → English example
- KEEP as domain terms: `ÄTA`, `Skatteverket`, `Kommun Gård 1:23`.

**Dark mode:** the sweep audited TEXT colours only. Still possible dark-on-dark on icons, borders, SVG fills, or components not caught. Also `.ui-button--secondary` base (0,3,0) beats the general `[data-theme='dark'] .ui-button--secondary` override (0,2,0) — so other secondary buttons may still render light in dark mode; if so, bump that override's specificity too. When something "won't change", inspect the live DOM before blaming the deploy.

**Hours:** consider surfacing "Reset to schedule" more prominently / a per-cell "reset" (clear one adjustment) — backend currently deletes by project+range only.
