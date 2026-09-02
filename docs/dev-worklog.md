# Dev worklog — byggexp-admin (+ ByggExp-BackEnd)

Running log of work + next steps, so a new session can continue instead of restarting.
Repos: `byggexp-admin` (Next.js admin) and `ByggExp-BackEnd` (NestJS). Both auto-deploy on push to `main` (VPS/PM2). Prod = admin.byggexp.se.

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

**Hours:** consider surfacing "Reset to schedule" more prominently / a per-cell "reset" (clear one adjustment) — backend currently deletes by project+range only.
