# Dev worklog — byggexp-admin (+ ByggExp-BackEnd)

Running log of work + next steps, so a new session can continue instead of restarting.
Repos: `byggexp-admin` (Next.js admin) and `ByggExp-BackEnd` (NestJS). Both auto-deploy on push to `main` (VPS/PM2). Prod = admin.byggexp.se.

---

## 🟢 SESSION 2026-09-20 — Perf, whole-repo review (28 bugs), schedule data-loss, UX/Laws-of-UX passes, sidebar favourites

Pushat till `main` löpande (~40 commits). `next build` + eslint + relevanta vitest gröna genom hela. Скрины «до/після» рендерились через **headless Chrome** (Claude-extension var frånkopplad hela sessionen — inga live-screenshots gick att ta).

### KLART (по темам)

**Projektkalkyl-perf (пользовательский приоритет — тормозило при add/select строк):**
- `KalkylRow` вынесен в отдельный компонент; строки получают **готовые примитивы** (vatText/netText/amountText), НЕ весь `table` → add/edit/select трогают только свою строку. React Compiler мемоизирует. Ранее: rAF-throttle бара + O(n) id→index maps. **NB: проект на React Compiler → НЕ добавлять ручные useCallback/memo с несовпадающими deps (падает eslint «compilation skipped»).**

**Ревизия всего репо (мульти-агент workflow, отчёт `/tasks/wh8li6kam.output`): 28 подтв. багов исправлено.** Ключевое: CRITICAL — project Finance/Overview часы фильтруются по projectId (была утечка всех проектов); валюта (Expenses/Payroll/company); worker TimeReport→/shifts/manual + фото→docs (раньше врали «сохранено»); KMA signed-lock; schedule TZ/copy-month; MyWork finance-gate + midnight-tick; ClientList «Paid» pill убран; certificate resolveUrl; ProjectOverviewTab planned-база с трудом; AssignmentChangesLog фильтр entityType=assignments; shifts «Fyll»+обед (нетто→брутто при записи); хардкод-строки локализованы (SV/NB/RU).

**Schedule data-loss (deep-research `/tasks/wvp83s6jr.output` → #1 client-side diff):** `handleSaveBar` теперь set-reconciliation — создаём только добавленные дни, удаляем убранные, overlap не трогаем → нет потери данных и нет 409. Смена проекта = заменяем всё.

**UX/минимализм + Laws-of-UX проходы** (агенты-дизайнеры; каждый с картинкой «до/после»):
- **Projektkalkyl иерархия таблицы:** Belopp жирный/тёмный (раньше шёл обычным весом через NumCell), второстепенные колонки muted #687898, «главная» текстовая колонка = с наибольшим числом разных значений (не константный Avsändare); шапка легче; Inkl.moms крупнее; header-грей на реальный токен.
- **Projektkalkyl Laws-of-UX:** Save → тихий статус «Sparat/Sparar…» (автосейв уже был); «+ Lägg till rad» на всю ширину; подсказка формул; «Mall» подписан; банк-импорт **keep-3** (оставляет date/desc/amount, остальное под «Visa alla»); меню «Вставить столбец» площе. **Откачено по просьбе юзера:** липкий Vinst-бар снизу + тонированные полосы Intäkt/Utlägg.
- **Mitt arbete упрощён:** корзин 6→4 (убран дубль deadlines, someday→upcoming); рельс дня off по умолчанию; шапка без 3 чипов; заголовки muted.
- **Dashboard упрощён:** убраны стрелки-тренды (шум/инверсия смысла); счётчики нейтральные без цветных кружков; Ekonomi первым блоком; Cashflow/Deadlines скрыты по умолчанию (дубли planning/Mitt arbete); storage v2→v3; `useBlockLayout` получил `defaultHidden`.

**Сайдбар — избранное:** звёздочка на пункте → группа «Favoriter» наверху (per-user+section localStorage). Багфиксы: клик не срабатывал (ссылка перекрывала звезду → дал z-index/pointer-events + toggle на mousedown); «Favoriter» сделан **сворачиваемым подменю**; активная категория (где открыта страница) теперь **тоже сворачивается** (auto-open только при навигации, не на каждом рендере); open-state storage v2→v3.

**FAB:** плавающая «+» тише — 48px, полупрозрачный синий (rgba .55), мягкая тень (был 56px + яркий синий ореол).

**Инфраструктура:** заведён `docs/todo.md` (task-inbox); отчёты research в `docs/research/bankimport-ux-redesign.md`; память `feedback_task_inbox_workflow`.

### 🔜 НАСТУПНІ КРОКИ (продолжить отсюда)
1. **Проверить live** после деплоя (юзер за компьютером): звезда/сворачивание Favoriter+активной категории; Dashboard money-first; Mitt arbete 4 корзины; банк-импорт keep-3.
2. **ProjektkalkylPublicView — валюта** (единственный отложенный баг, нужен BACKEND): `findByShareToken` payload + `currency`; FE → `formatMoney` + GREEN/RED из kalkylTableUtils (сейчас зашит SEK, ломается для NOK).
3. **Bankimport крупные фичи** (если направление ок): bulk-категоризация Xero-стиль (выдели N → одно поле → во все) и/или split строки (Bokio). База «выдели → Flytta till tabell» уже есть.
4. **UX-проход по остальным тяжёлым экранам:** Планирование (Schedule), Hours-grid — как сделали с Projektkalkyl/Mitt arbete/Dashboard.
5. **Мелочь:** остаток автосейф dup-хелперов (today()/STATUS_OPTIONS/TONE_TAG/invoiceValue/getRoleColor/resolveAttachmentUrl).

---

## 🟢 SESSION 2026-09-19 (b) — Projektkalkyl: en enda "svept rad"-look + bort med auto-collapse

Pushat till `main` (3 commits). `next build` + eslint rena, projektkalkyl-tester gröna (29). Filer: `src/features/projektkalkyl/KalkylTable.jsx`, `projektkalkyl.scss`.

### KLART
1. **Enad "collapsed rows"-look** — tidigare fanns TVÅ olika svepta rader (blå textlänk «Visa alla (456)» för auto-collapse vs. den grå grupp-raden «5 rader» man själv skapar). Nu renderas BÅDA via en delad `summaryRow()` i `KalkylTable.jsx`: samma tonade rad (`.kalkyl-group-row`, bg `#f7f9fb`/hover `#eef3f8`), chevron ▸/▾ i checkbox-kolumnen, «N rader» (600/`#052d50`) i första kolumnen, summan högerställd i belopp-kolumnen.
2. **Design-agent-pass** (användaren bad om «riktig designer»): hela raden är klickbar (`cursor:pointer` + row `onClick`, chevron/⋮ stoppar propagation); chevron ljusnar till primary på hover; **summa-fallback** — om tabellen saknar `amount`-kolumn hamnar totalen i sista numeriska kolumnen (annars inline efter räknaren) så den aldrig försvinner.
3. **Auto-collapse HELT BORTTAGET** (sista användarönskan, se skärmdump): långa tabeller sveps inte längre ihop automatiskt till «456 rader» — alla rader visas alltid. Att svepa ihop är nu **enbart** en medveten användaråtgärd (markera rader → gruppera). Tog bort oanvänd `expanded`-state + `COLLAPSE_AT`-import.

### 🔜 NÄSTA STEG
1. **Verifiera live** (användaren tittar imorgon): öppna en Bankimport-kalkyl → inget «456 rader» högst upp, alla rader syns; markera några rader → «Fäll ihop» → grå summary-rad med chevron + summa; klicka raden → fälls ut/in; ⋮ → «Dela upp grupp».
2. Klart om inget mer flaggas. (Design-agentens övriga polish var medvetet utelämnad: gruppens ⋮ har «Dela upp», auto-collapse hade den inte — nu är auto-collapse borta så frågan är moot.)

---

## 🟢 SESSION 2026-09-19 — Projektkalkyl UX: enklare tabellskapande + formler i cellen + bankimport-preview

Pushat till `main`. `next build` + eslint rena, projektkalkyl-tester gröna (29, inkl. nya `evalFormula`-tester).

### KLART
1. **"New table" förenklad**: tabelltypen visas nu som **synliga brickor** (ingen dropdown) med **"From Excel"** som förstahandsval → skapar en Simple-tabell + öppnar bankfil-importen i ETT steg (delar filväljaren med ⚙ Import via `pickBankFile`). VAT/Färg komprimerade till Name-raden. (`ProjektkalkylDetailPage.jsx`.)
2. **Formler i cellen**: Amount/qty/price/number-celler är nu ett mini-formelfält — skriv ett tal ELLER ett uttryck (`2+2`, `=10*3`, `(1200+300)*1.25`) → räknas ut på blur/Enter. Säker evaluator (endast siffror/operatorer/parenteser) i `kalkylTableUtils.evalFormula`; ny `NumCell` i `KalkylTable.jsx` ersatte `InputNumber`. Enhetstestad.
3. **Bankimport-preview städad**: de 3 matchade kolumnerna highlightas; «×» på övriga döljer dem; «Only the matched columns are imported»-hint + «Show hidden columns»-reset. (`BankImportModal.jsx`.)
4. i18n för allt nytt i sv/nb/ru.

### 🔜 NÄSTA STEG
1. **Verifiera live**: (a) Add table → «From Excel» → filväljare öppnas direkt → import. (b) Skriv `=1200*1,25` i en amount-cell → blir 1500. (c) Preview: dölj kolumner, highlight på de matchade.
2. Ev. utöka formler till fler operatorer/procent om användaren vill; annars klart.

---

## 🟢 SESSION 2026-09-18 (c) — projectAdmin = capability-gated scoped admin (both repos)

Pushat till `main` i båda repona. FE `next build` + eslint rena; BE `tsc --noEmit` rent.

### KLART
Problem: en ny projectAdmin (`company@byggexp.se`) såg nästan inget («Access denied»). Orsak: FE gejtade projectAdmin till en avskalad `/projects`-panel + role-baserade routes. Nu:
- **projectAdmin delar company-panelen, gejtad PER CAPABILITY** (ej roll). Ny `src/shared/config/companyCapabilities.js`; `DashboardSidebar` filtrerar items, `DashboardLayout.CompanyCapabilityGuard` blockar URL-åtkomst; redirect projectAdmin→`/company`; company-layoutens allowedRoles += projectAdmin. Full admins (companyAdmin/superadmin) bypassar.
- **Backend user-scoping:** nytt `createdBy` på user-schemat (stämplas vid create); `findManageableUsers` → projectAdmins stafflista = skapade av hen + medlemmar i hens projekt (aldrig hela företaget); wire i `GET /users/my-company`. projectAdmin får skapa/redigera/radera **worker + peer-projectAdmin** hen skapat (aldrig companyAdmin/superadmin).
- **"Admin type" vid user-create** (endast companyAdmin/superadmin): Full (ger `finance.manage`) / Limited. En projectAdmin kan skapa peers men **inte ge finance** (permission-endpoint är companyAdmin+) → skyddar monetiseringen (ingen kan plodda companyAdmins/sälja access).
- Fix `company@byggexp.se`: Users → user → Permissions → bocka Finance.
- **Dashboard-städning (efter live-test):** dashboarden naggade projectAdmin med «Access denied»-toasts + tomma ekonomi-block. Nu: ekonomi-block (Economy/Payments/Cashflow) + deras fetch gejtas på `finance.manage`, Personnel på `employees.manage` (`DashboardPage.jsx`, `useEconomyData(enabled)`); shifts/tasks-overview laddas `silent`. **Central fångst:** `appMessage.error` sväljer nu backendens RolesGuard-brus (`/required roles:/i`) globalt (`src/utils/appMessage.js`) — så den sortens icke-åtgärdbara 403-toast aldrig visas, oavsett vilken store som fyrar den.
- **UX-fix:** luft under «Admin type»-hjälptexten (`marginBottom` på fältet) så den inte klistrar i «Name».
- **VERIFIERAT LIVE av användaren:** projectAdmin ser rätt meny (capability-gejtad), Users öppnas (scoped), «Admin type»-väljaren funkar, inga toasts på formuläret. ✅

### 🔜 NÄSTA STEG (fortsätt här)
1. **Bekräfta att toasterna är borta** efter senaste deploy (hard-refresh) på company-dashboarden som en Limited projectAdmin. Om något rött 403 kvarstår: DevTools → Network → ta path:en; men den centrala `appMessage`-fångsten bör täcka allt.
2. **Kosmetik (valfritt):** gejta CommandPalette/DashboardPageHeader-actions per capability så en projectAdmin inte ens ser finance-actions (klick→/unauthorized idag).
3. **Gamla users saknar `createdBy`** (ingen backfill) → de syns inte i en projectAdmins scoped lista. Om det behövs: en engångs-backfill (t.ex. sätt `createdBy` = company-admin) — annars ok.
4. **Ev. nästa:** låt en projectAdmin även redigera «Admin type» på en peer den skapat (idag sätts finance bara vid create av companyAdmin+; permission-panelen är companyAdmin+). Kräver beslut om man vill lätta på det.
5. Kvar sedan tidigare: Projektkalkyl **BgMax-parser** + Open Banking Phase 2 (se session (b)); Articles cleanup (se 2026-09-17).

---

## 🟢 SESSION 2026-09-18 (b) — Bank-file import into Projektkalkyl (Phase 1) + total-column width + research

Allt pushat till `main` (admin auto-deploy). `next build` + eslint rena, `npm test` grönt (46+ tester, inkl. 5 nya).

### KLART
1. **Bankfil-import med kolumn-mappning** (Projektkalkyl). Per-tabellens «Import» (⚙) öppnar nu en **BankImportModal**: välj CSV/XLSX → mappa vilken kolumn som är Datum / Beskrivning / Belopp — ELLER separata In/Ut-kolumner (slås ihop till signerat belopp) — med **live-preview** innan import. Raderna hamnar i den tabell (Income/Expenses) importen startades från; Expenses vänder tecknet positivt.
   - Hanterar svenska `;`/Windows-1252-CSV (TextDecoder-fallback) och europeiska/parentes-negativa talformat.
   - Filer: nya `BankImportModal.jsx` + utökad `excelImport.js` (`readBankSheet`, `buildBankRows`, robustare `parseAmount`, In/Ut-alias); `ProjektkalkylDetailPage.jsx` (öppnar modal + `applyBankRows`). Nya rena helpers enhetstestade i `excelImport.test.js` (5 tester). i18n-nycklar i sv/nb/ru.
   - Bakgrund: forskningsrapport `docs/research/bank-import-benchmark.md`. **Nyckelinsikt:** gratis Nordigen/GoCardless är STÄNGT för nya → filimport är rätt Phase 1; Open Banking (Enable Banking gratis-tier på DERAS AISP-licens) är Phase 2. Bygglet har INGEN bankimport → vi ligger redan före.
2. **Total-kolumnen i Purchase invoices bredare** (120→150px) så «37 990,00 SEK» inte kapas; `scroll.x` 1168→1200.

### 🔜 NÄSTA STEG
1. **Verifiera importen live**: ⚙ på en Projektkalkyl-tabell → Import → ladda en riktig bankfil (SEB/Swedbank/Handelsbanken/Nordea) → kolla att kolumn-gissningen stämmer, preview ser rätt ut, raderna landar rätt. Testa både en-kolumns-belopp och In/Ut. Testa en `;`-CSV med åäö.
2. **Ev. BgMax-parser** (Bankgirot inbetalningar, fast 80-tecken) om de vill dra in kundinbetalningar direkt — strukturerat, ingen mappning behövs. Se rapporten.
3. **Phase 2 (om efterfrågas)**: Enable Banking live-feed (SE+PL), 180-dagars re-consent.
4. Öppen fråga från användaren obesvarad: vilket är deras bank + en/två beloppskolumner (mappnings-UI hanterar båda ändå).

### ⚠️ Öppna frågor
- Pre-existerande `no-dupe-keys`-eslintfel i nb/ru (rad ~1600–2000, ej mina) kvarstår; bygget bryr sig inte.

---

## 🟢 SESSION 2026-09-18 — Multi-file attachments (invoices/receipts) + Projektkalkyl row-selection sum

Allt pushat till `main` i BÅDA repona (admin + backend, auto-deploy). Backend `tsc --noEmit` rent, admin `next build` grönt. i18n för nya EN-nycklar i sv/nb/ru.

### KLART
1. **Flera bilagor på leverantörsfakturor OCH utlägg/kvitton** (tidigare bara EN fil).
   - Backend (`ByggExp-BackEnd`): nytt fält `attachments: string[]` på `SupplierInvoice`- och `Expense`-scheman (primär scan = `attachmentUrl`/`receiptUrl` kvar). Nya endpoints `POST :id/attachments` (FilesInterceptor, upp till 10) + `DELETE :id/attachments` (body `{url}`, raderar filen från `./uploads`, path-guardad). Zip-nedladdningen buntar nu primär + alla extra. DTO:er fick `attachments?: string[]`.
   - Admin FE: `SupplierInvoiceForm.jsx` + `ExpenseForm.jsx` — «Attach file» är multi-select, extra-filer listas med öppna/ta-bort, pending-filer laddas upp vid spara, befintliga extra raderas direkt via API. `SupplierInvoiceListPage.jsx`: gemet visar filantal, per-rad/bulk-nedladdning zippar när >1 fil (`downloadRow`, `fileCount`, `firstFileUrl`).
   - Filer: BE `supplier-invoices/{controller,service,schema,dto}` + `expenses/{controller,service,schema,dto}`; FE de tre ovan + `messages/{sv,nb,ru}.js`.
2. **Projektkalkyl: bocka rader → se deras summa** (`KalkylTable.jsx`). Checkbox per rad + select-all i headern; en «Selected (N)»-chip i foten visar summan (`lineAmount` över valda rader, överlever ihopfällning). Vald rad får svag ton (`.kalkyl-row--selected` i `projektkalkyl.scss`), rensa-knapp. Rent view-hjälpmedel, inget sparas. Nya nycklar `Selected`/`Clear selection` (`Select all` fanns).

### 🔜 NÄSTA STEG
1. **Verifiera live**: (a) öppna en faktura/kvitto → «Attach file» flera filer → spara → gemet visar antal → ⬇ zippar; ta bort en extra-fil funkar. (b) Projektkalkyl «Зарплата» → bocka några rader → «Selected (N)»-summan stämmer.
2. Kvarvarande från 2026-09-17: **Articles cleanup & content refresh** (scope ännu ej fastlagt — se nedan).

### ⚠️ Öppna frågor
- `messages/nb.js` + `ru.js` har SEDAN TIDIGARE ett gäng `no-dupe-keys`-eslintfel (rad ~1600–2000, ej mina) — bygget bryr sig inte, men värt en städ-runda någon gång.
- Inget blockerande.

---

## 🟢 SESSION 2026-09-17 — Projektkalkyl full-copy + Project Goals roadmap UX pass

Alla ändringar pushade till `main` (admin-repo, auto-deploy). `next build` + eslint rena. i18n för varje ny EN-nyckel tillagd i sv/nb/ru. Inga backend-ändringar behövdes (befintliga DTO:er tog emot fälten).

### KLART (gjort denna session)
1. **Projektkalkyl: «Duplicate» (full kopia) från listan.** Rad-⋮ i `ProjektkalkylListPage.jsx` fick «Duplicate» (mellan Open/Delete). Ny store-action `duplicate(id, copyName)` i `src/store/projektkalkylStore.js` — hämtar hela posten via `fetchOne`, POST:ar en kopia med name+«(copy)», note, currency, projectId, tables; share-token & kommentarer kopieras medvetet INTE. Backend `CreateProjektkalkylDto` tog redan alla fält. i18n: `Duplicate` (`copy`-nyckeln fanns redan).
2. **Project Goals (`ProjectGoalsTab.jsx`) — flera UX-fixar** (triggat av att användaren la upp ett riktigt «ByggExp.se content refresh»-mål):
   - **Type-to-create tasks i en etapp**: adder är nu ett vanligt textfält — skriv + Enter (eller ＋) skapar en checkbar task i etappen. Att välja en befintlig projekt-task finns kvar men gömt bakom en liten ▾. (Subkomponent `StageTaskAdder`.)
   - **Etappens datum/beroenden/flytta/radera flyttade in i en ⋮-kebab** (antd `Dropdown` + `popupRender`); en kompakt 📅-chip visar schemalagt intervall när satt. Rensade huvudet.
   - **Buggfix: tom etapp (0/0) visade «In progress»** → nu är «In progress» första etappen som FAKTISKT har tasks och inte är klar; tomma etapper är «Upcoming». (Logik i `stageInfo`.)
   - **Auto-save**: debounced tyst spara ~1s efter varje ändring (`save({silent})` + `useEffect`). «Save changes»-knappen kvar som fallback.
   - **Inline-edit**: klicka en etapp-rads text → redigera på plats (Enter/blur sparar via task-store `update`, Esc avbryter). Subkomponent `EditableTaskTitle`.
   - i18n nya nycklar: `Add or create a task…`, `Add an existing task`, `Create`, `Type to search or create a task`, `Scheduled`, `Stage options`, `Click to edit` (sv/nb/ru).
   - Filer: `src/features/projects/components/tabs/ProjectGoalsTab.{jsx,scss}`.

### 🔜 NÄSTA STEG (fortsätt här nästa gång)
1. **Ny arbetsuppgift som väntar: «Article catalog cleanup & content refresh»** (användarens eget namn på den). Gäller Register → Articles (artikelkatalogen, `src/features/articles/*` + `articleStore.js`). Scope ännu ej fastlagt — fråga om det är (a) UI/UX på sidan, (b) datakvalitet i katalogen (dedup/enheter/pris/moms/seed), (c) texter/i18n, eller (d) kopplingen till Offer/Invoice-raderna. Börja med att klargöra scope, döp sedan grenen `chore(articles): cleanup and content refresh`.
2. **Verifiera Goals-flödet live** (hard-refresh): skriv + Enter i en etapp → task skapas & auto-sparas; klicka en rad → redigera inline; tom etapp visar «Upcoming»; ⋮ innehåller datum/beroenden/flytta/radera; Projektkalkyl-listans ⋮ → «Duplicate» öppnar «<namn> (copy)».
3. **Ev. polish Goals** (om användaren ber): task-store `create`/`update` toastar «Task created»/«Task updated» vid varje Enter/edit — kan kännas pratigt; överväg tyst läge i denna vy. Auto-save vid nätfel gör tyst retry var ~1s (ingen toast) — acceptabelt men värt att veta.

### ⚠️ Öppna frågor / väntar på
- Scope för Articles-uppgiften (se NÄSTA STEG #1).
- Inget blockerande. Tidigare aktiveringspunkter (prod `ANTHROPIC_API_KEY` + SMTP) oförändrade per [[project_pending_activations]].

---

## ▶ RESUME HERE — state as of 2026-09-16 (read this first)

Session = **Projektkalkyl salary/cost lines + Overview shows detailed sheets folded + public share mobile fix**. All pushed to `main` (admin repo, auto-deploys). `next build` + eslint clean; 21 projektkalkyl unit tests green. i18n added to sv/nb/ru for every new EN key. Files: `src/features/projektkalkyl/{kalkylModel,KalkylTable,Side,ProjektkalkylDetailPage,ProjektkalkylPublicView}.jsx/.js` + `kalkylModel.test.js` + `src/i18n/messages/{sv,nb,ru}.js`.

### KLART (gjort denna session)
1. **Amount = sum of number columns** (triggered by Maria/Ekonomi: a salary line's real cost = paid-to-card + preliminary tax + employer fees, must add into ONE «Сумма»).
   - `kalkylModel.js`: new `sumsNumberCols(table)` = `amountFromNumbers && has a number column`. `lineAmount` now returns the SUM of the row's `number` cells when in that mode (else qty×price, else typed amount). Flows through totals/VAT/public/export automatically (all use `lineAmount`).
   - `KalkylTable.jsx`: ⚙ settings gained **«Amount value»** select → *Entered directly* (default) | *Sum of the number columns*. When on, the Amount cell renders read-only computed (like qty×price). `computedAmount` now also true in sum-mode.
   - How Maria uses it: ⚙ on the «Зарплата» table → Amount value → Sum of the number columns; type the 3 numbers (Utbetalas/Preliminärskatt/Arbetsgivaravgift) → «Сумма» auto-sums (verified live: 34 809,9+8 227+12 008 = **55 044,90**) and feeds the total/Profit.
   - Unit tests added (55 044,90 case + flag off + no-number-col guard).
2. **Overview now shows the detailed sheets FOLDED** (user: «работать в Income/Expenses, потом подтягивать в общее и там разворачивать/сворачивать»).
   - Was: Overview only rendered `detail:false` tables; detail sheets were hidden behind a muted «+ N detailed sheets (in the total)» link.
   - Now: `Side.jsx` takes `detailTables` and renders them **collapsed** under a «Detailed sheets (N)» header + an «Edit full width ↗» link (jumps to that side's tab). `KalkylTable.jsx` got a `startFolded` prop (inits the existing `folded` state). Expand/collapse each inline via its ▸/▾ chevron. `ProjektkalkylDetailPage.jsx` passes `detailTables={detailIncome/detailExpense}` in Overview. Income/Expenses tabs unchanged (full-width work view). Nothing double-counts.
3. **Public share (`/kalkyl/<token>`) mobile overlap fixed.** `ProjektkalkylPublicView.jsx` ReadTable used `tableLayout:fixed`+`width:100%` → on a phone columns squeezed below content width and text overlapped. Now `tableLayout:auto` + table `minWidth` = Σ per-column widths (`colWidth`: text 150 / date 120 / numeric 100, saved width wins); numbers+dates `nowrap`, description wraps → the card scrolls horizontally on narrow screens, desktop unchanged.

### 🔜 NÄSTA STEG (fortsätt här nästa gång)
1. **Verify live on phone** (hard-refresh): open a share link on mobile → columns scroll, no overlap. And on admin: Overview shows «Зарплата»/«Общие расходы» folded under «Detailed sheets», chevron expands them.
2. **Sum-mode niceties (optional)**: the read-only Amount label still says «Сумма» — fine; could show a tiny «Σ» hint. Also sum-mode ignores VAT back-out per row like any 0% table (salary is momsfri) — if a sum-mode table ever needs VAT, the existing per-row VAT still applies to the summed figure.
3. **Detail-in-Overview polish (optional)**: expanded detail tables in Overview are half-width (cramped for wide sheets) — acceptable, user has «Edit full width ↗». Consider a per-table «pin expanded in Overview» memory if they ask.
4. **i18n**: new keys (`Amount value`, `Entered directly`, `Sum of the number columns`, `Detailed sheets`, `Edit full width`) added to sv/nb/ru only (the comprehensive trio, matching the sibling `How the Amount is entered`). Other 7 locales fall back to English — extend if a fully-translated pass is wanted.
5. Carry-overs from 2026-09-14 still stand: Projektkalkyl export/PDF/public are SEK-only (`formatSek`), not the calc currency; PDF/Excel don't visually group Overview vs detail. See below.

### ⚠️ Öppna frågor / väntar på
- Nothing blocking this session. Earlier activation items (prod `ANTHROPIC_API_KEY` + SMTP) unchanged per [[project_pending_activations]].

---

## ▶ RESUME HERE — state as of 2026-09-15 (read this first)

Session = **Purchase invoices: foreign-currency + attachments everywhere + superadmin storage report + bulk download**. Triggered by a real EUR supplier invoice (April Trade Kft, 7 000 EUR) being booked as 7000 SEK. All pushed to `main` (both repos auto-deploy). FE ESLint clean, BE `tsc --noEmit` clean.

### KLART (gjort denna session)
- **Currency fix** — the scanner already read `currency` but it was dropped everywhere. Now persisted + shown:
  - BE `src/scanning/scanning.service.ts`: reads the document's real ISO currency (no SEK assumption), extracts `iban`/`bic`, accepts a foreign company/VAT no. as `supplierOrgNumber`.
  - BE `supplier-invoices` schema + DTO: added `currency` (default SEK), `iban`, `bic`.
  - FE `SupplierInvoiceForm.jsx`: Currency picker (defaults to company currency), IBAN/BIC fields, currency-aware Excl./VAT/Total labels; `BulkScanInvoiceModal.jsx` captures/saves them; list Total renders in the invoice's own currency.
- **Always store the original file, from every entry point:**
  - `SupplierInvoiceForm.jsx` — keeps the scanned file + "Attach file" button; uploads to the invoice on save; "Open original" when editing. `ScanButton.jsx` now hands the raw File back via `onScanned(data, file)`.
  - `ExpenseForm.jsx` — new expense now stashes the scanned/attached receipt and uploads it right after create (was blocked until saved).
  - `BulkScanModal.jsx` (receipts) — attaches each file to its created expense (bulk invoices already did).
- **Superadmin storage report** — how much each company occupies on disk:
  - BE `src/company/storage-usage.ts` (new) + `company.service.storageUsage()` + `GET /company/storage-usage` (superadmin). Stats real files under `./uploads`, attributes per company across ALL file-bearing collections (logos, supplier-invoices, expenses, ÄTA, dagbok, tools, bug-reports, project/task docs, user files, shift photos, chat).
  - FE `src/features/companies/StorageUsagePage.jsx` + route `app/admin/storage/page.jsx` + sidebar item "Storage usage" (System group). New util `src/utils/formatBytes.js`.
- **List: visible download + bulk download** — per-row ⬇ button (when attached); select rows → "Download originals (n)" → single opens, several stream a **zip** via `POST /supplier-invoices/attachments/zip` (BE, uses `archiver`, now in package.json; company-scoped via `findOne`). Selection clears after download, on **Esc**, and on **click-outside**.
- i18n: new EN keys translated in `sv.js` + `nb.js` (reused existing `Files`/`Storage`/`Currency`/`Size` to avoid dup-key lint).
- Commits (admin): currency, attachments+storage, zip download, selection-clear. (backend): currency, storage report, zip endpoint.

### 🔜 NÄSTA STEG (fortsätt här nästa gång)
1. **Scanner activation** — the "Scan"/"Scan multiple" buttons only appear when `ANTHROPIC_API_KEY` is set (`GET /scan/status`). Attachments/storage/download all work without it. Confirm the key is set in prod if the user wants scanning live. See [[project_pending_activations]].
2. **Reverse-charge VAT** — EU B2B invoices (like April Trade) are omvänd skattskyldighet: VAT 0 is correct but the buyer must self-account. Scanner doesn't flag it. Offer a "reverse charge" marker if the user wants it in the books.
3. **FX to SEK** — amounts are stored in the invoice's own currency (EUR), not converted. If reporting/liquidity needs a SEK equivalent, add an FX rate source (decision + provider needed).
4. **Optional** — companyAdmin-scoped "my company storage" mini-view (user asked "может"; not built). Superadmin page is live.
5. The 3 pre-existing invoices (Webhallen/HOJAB/April Trade) had no stored file until the user attached them manually via "Attach file" post-deploy.

### ⚠️ Öppna frågor / väntar på
- Prod `ANTHROPIC_API_KEY` + SMTP still pending per [[project_pending_activations]] — unchanged.
- Whether to add reverse-charge flag and/or FX-to-SEK (both waiting on user's call).

---

## ▶ RESUME HERE — state as of 2026-09-14 (read this first)

Session = **Projektkalkyl board: tabs + separate detail sheets + resizable/elastic columns**, plus a quick check on the **marketing site** (`ByggExp-NextJs`). All admin work pushed to `main` (auto-deploys). `next build` + eslint clean; the 18 projektkalkyl unit tests green. i18n added to all 10 locale files for every new EN key. Files touched: `src/features/projektkalkyl/{ProjektkalkylDetailPage,Side,KalkylTable,ProjektkalkylPublicView}.jsx`, `kalkylModel.js`, `projektkalkyl.scss`, `src/i18n/messages/*.js`.

### 1) Overview / Income / Expenses view switch (Segmented)
- Added a `Segmented` tab bar above the board: **Overview** (default) | **Income** | **Expenses**. `activeSide` state = `'both' | 'income' | 'expense'`.
- **Overview** = the original two-column board (income left / expenses right), simple tables.
- **Income/Expenses tabs** = the same side rendered **full-width** so wide/many-column tables fit. Tab labels show that side's brutto total (green/red).
- User was explicit: keep Overview as-is; the tabs are ADDITIONAL, not a replacement.

### 2) Separate DETAIL sheets per side — all counted in one total
- Tables now carry a **`detail` flag** (`newTable` opt; `kalkylModel.js`). `detail:false` = simple Overview board; `detail:true` = the side's full-width detail sheet.
- Overview renders `!detail` tables; Income/Expenses tabs render that side's `detail` tables. **"Add table"** inherits the tab's detail flag.
- **Everything counts toward the total & Profit** (user: «маленькие таблицы с обзора и с отдельных вкладок считаются в общий баланс»). `sideTotals`/`incomeTotals`/`expenseTotals` sum ALL tables regardless of tab — unchanged, already correct.
- Each table's ⚙ settings gained **"Move to Overview / Move to detailed sheet"** (`onToggleDetail` → toggles `detail`). This is the user's "import" — relocate a table between board and sheet.
- Overview shows a muted **"+ N detailed sheets (in the total)"** line under Add-table (click → jumps to that tab) so the per-side TOTAL reconciles with visible rows. `Side` props: `detailCount`, `onShowDetail`.
- Pulled-from-project tables land on Overview (`detail:false`) and switch view to `'both'`.

### 3) Columns: usable width + removable + elastic (several iterations — LAND HERE)
Final behaviour after back-and-forth:
- **New columns are usable width**, not zero-width. Per-type defaults `COL_DEFAULT_W` (all ≥70): text 240, date 132, amount 90, number 96, qty 88, price 96, vat 72, amount_excl 100.
- **Extra text columns are removable** — only the *primary* Description (`firstTextId`) + amount/qty/price are protected (`canRemove`).
- **Drag-resize** on every non-Description header (right-edge handle `.kalkyl-col-resize`, rAF-throttled, min **70px**, width persisted on the column → autosaved). Widths also honoured in the public share view.
- **Table always FITS its width — NO right overflow.** Description is the elastic column: `width:auto`, `minWidth:90`, shrinks first; all other columns hold their width (`width`+`minWidth`=their px). Layout is `tableLayout:auto`, `width:100%`; horizontal scroll only as a last resort once Description hits 90. Description has **no** resize handle (it's the elastic one). User was very explicit: «вправо ничего уезжать не должно… должен уменьшаться description».
  - NOTE: earlier this session I briefly tried `tableLayout:fixed` + `width:totalW` (spreadsheet scroll) to fix a "resize grows leftward" complaint — but that overflowed right, which the user rejected. The elastic-Description model above is the final answer; don't reintroduce fixed-width scroll for the Overview.

### 4) Marketing site (`ByggExp-NextJs`) — AI-generation check (NO code change)
- User asked if the non-working "Generera med AI" block was removed everywhere. **Confirmed removed in code** (commit `91374d8` "…ta bort AI-blocket"); grep finds no `Generera med AI` / `Vad ska du kontrollera` / `aktiveras inom kort` anywhere; no LeadMagnet tool renders an AI block. `main` == `origin/main`.
- Live byggexp.se still showed it ⇒ **stale deploy/cache**, not code. Site is SSR (`getServerSideProps`, no ISR) and auto-deploys on push to `main` via `.github/workflows/deploy.yml` (VPS 185.189.51.128, PM2, `workflow_dispatch` enabled). User said «всё сделал» (likely re-ran the deploy). Dead route `src/pages/api/egenkontroll-generate.ts` still exists but is unreferenced.

### NEXT STEPS (2026-09-14)
1. **Verify live** on admin.byggexp.se (hard-refresh): the 3-way Overview/Income/Expenses switch; add a table on the Expenses tab → its sum shows in Overview's Profit; ⚙ → "Move to Overview" relocates it; drag a non-Description header to resize (min 70); confirm the board never scrolls right in Overview (Description shrinks instead).
2. **Projektkalkyl still SEK-only in export/PDF/public** (carry-over): `ProjektkalkylPublicView` + `excelExport` use `formatSek`, not the calc currency. Thread currency through if multi-currency matters.
3. **PDF/Excel don't distinguish Overview vs detail** — they list all tables per side (correct for totals, but no visual grouping). Fine for now; revisit if user wants the detail sheets sectioned in exports.
4. **Optional**: a "fit to width" toggle for detail tabs (right now a narrow detail table leaves blank space on the right — acceptable/spreadsheet-like, user not blocked).
5. **Marketing site**: if byggexp.se still shows the AI block after redeploy, check the GitHub Actions "Deploy to VPS" run status; optionally delete the dead `pages/api/egenkontroll-generate.ts`.
6. Older Projektkalkyl open items from 2026-09-12 still stand (payroll-pull polish: DRAFT runs? gross vs employer cost?; pull-category copy). See below.

---

## ▶ RESUME HERE — state as of 2026-09-12 (read this first)

Whole session was **Projektkalkyl UX/logic polish + a code-quality pass**. All pushed to `main` (both repos auto-deploy). `next build` + backend `tsc` green, eslint clean, new unit tests green. i18n added to all 10 locale files in `src/i18n/messages/{sv,nb,ru,pl,fi,et,lv,lt,uk,bs}.js` for every new EN source key. See memory `project_projektkalkyl`.

### 1) VAT model flipped to GROSS-by-default (the big behaviour change)
- `amountIsGross(table)` now returns `table.amountInclVat !== false` → the typed **Amount is the total incl. VAT**, and net + VAT are **backed out** of it (500 @25% → net 400 + VAT 100; 313,32 → 250,66). Was the opposite (added 25% on top). `kalkylModel.js`.
- Per-table ⚙ toggle «How the Amount is entered» switches to net mode (adds VAT on top). Existing saved calcs re-interpret typed amounts as gross on next open.

### 2) Columns: VAT + «excl. VAT» computed columns
- New computed column type **`vat`** (+ existing `amount_excl`). Both read-only, right-aligned. Header labels shortened: column shows «excl. VAT» (menu/settings unchanged).
- **New-table modal** gained a 3rd type **«Goods with VAT (Amount → VAT → excl. VAT)»** that seeds Description|Date|Amount|VAT|excl.VAT (VAT default 25%). Preset boards: the 25% tables (private clients, materials) start with these columns; 0% ones stay simple. 4 default tables on new calc (added Expenses—salaries, purple).
- Column management is now Airtable-style: **`+`** at the row end only ADDS (Text/Number always; Date/VAT/excl.VAT disabled once present); **`×`** on each column header REMOVES (dim, always visible; Description/Amount/qty/price protected). No more inline delete jumping left/right.
- «+» add uses `insertColumn` (canonical COL_ORDER) so a re-added column lands in the right spot.

### 3) Table UX
- **Fold/collapse a whole table** via a ▾/▸ chevron in its header (shows Incl. VAT total inline when folded). Separate from the long-row «Show all/Collapse».
- **New-table colour auto-cycles** to the next palette entry after the last table on that side.
- Layout: Description column flexes to fill; Date/Amount/VAT/excl.VAT have min widths so they don't collapse; header font 11px/500 muted; left padding aligned with the coloured title; Amount/VAT/excl.VAT ~30% narrower.
- Removed the currency picker + the duplicate Scan button in ⚙ (Scan lives in the header strip). Narrowed the name field.

### 4) Date column = cash-flow date (per side)
- Header is side-aware: income → **«Expected payment»**, expense → **«Due date»** (`dateLabel`). Old calcs auto-migrate generic Date/Datum/Dato/Дата labels on load (`migrateDateLabels`; leaves custom labels).
- Scanned invoices + pulled rows use the **due date (förfallodatum)**, not the invoice date. Backend `scanning.service.ts` prompt now maps `dueDate` to the payment deadline («Förfallodatum/Betalas senast/Oss tillhanda senast/Sista betalningsdag…») and explicitly ignores «Huvudförfallodag»/renewal/period ranges.

### 5) Scan/import fill empty rows first
- `fillRows(tb, newRows)` fills existing blank rows before appending; used by both scan (`scanFilesIntoTable`) and Excel import.

### 6) «Pull from project» → by CATEGORY (was all-or-nothing)
- `projActuals` grouped as `{invoices, supplier, expenses, salaries}`. After picking a project, **inline chips** appear (colour dot + live count): Customer invoices → income; Supplier invoices / Expenses / **Salaries** → expenses. Click one → drops just that category as its own editable gross table. Removed the old read-only «From the project» preview.
- **Payroll pulled in**: approved/paid runs, amount = full labour cost (`totalEmployerCost` fallback `totalGross`), momsfri, dated by `paidAt`/period end. Includes runs with **no projectId** (payroll is usually company-wide) as well as this project's.

### 7) Code-quality pass (two review agents: correctness + cleanliness)
- Fixed: **Profit parity** — public share view + Excel now use net−net (Excl. VAT) like the editor (was incl-VAT). qty/price columns non-removable. Duplicate single-instance columns blocked.
- Cleanup: removed dead `VAT_RATE` + `markupPct`/`contingencyPct` (no-op); un-exported internal-only `rowVatRate`/`tableColumns`; extracted `nearestVatRate`/`cellValue`/`isNumericColumn` and reused across editor/export/public; `presetTables` reuses `tableColumns`.
- **File split** (thin-adapter, no behaviour change): `ProjektkalkylDetailPage.jsx` 810→~490 lines; extracted `KalkylTable.jsx`, `Side.jsx`, `SummaryPanel.jsx`, and pure `kalkylTableUtils.js` (amountFmt/amountParse, COL_W, insertColumn, fillRows, GREEN/RED, COLLAPSE_AT).
- **18 unit tests** added: `kalkylModel.test.js` + `kalkylTableUtils.test.js` (VAT math, cellValue, totals, nearestVatRate, dateLabel/migrate, insertColumn, fillRows). `npx vitest run <files>` green (full `npm test` is watch-mode/slow — run specific files).

### NEXT STEPS (2026-09-12)
1. **Backend deploy timing**: the `scanning.service.ts` dueDate prompt fix + admin changes deploy on push; already-scanned rows keep their old dates — re-scan or re-pull to refresh. Consider a one-off backfill if needed.
2. **Payroll pull polish (confirm with user)**: currently pulls DRAFT-excluded (approved/paid only) and uses **employer cost** (gross+31.42%). User may want (a) DRAFT/planned runs too for forward cash-flow, (b) gross or net instead of employer cost. Also amount is per-RUN (one row); could split per employee line.
3. **Pull categories**: labels are generic EN keys («Customer invoices» etc.). User hinted at clearer wording — consider «Исходящие счёта / Фактуры поставщиков / Зарплаты» style per-locale (already localized, but revisit copy).
4. **Projektkalkyl export/share still SEK-only**: `ProjektkalkylPublicView` + `excelExport` use `formatSek`, not the calc currency (currency picker was removed from the toolbar — currency now = company default). If multi-currency matters, thread the calc currency through.
5. **Optional minor dedups from the review** (not done): shared `<ProfitBox>` between editor/public; `vatRateOptions(t)` helper for the two VAT `<Select>`s; move `rowFromScan` into utils. Low priority.
6. **markup/contingency** were removed as dead — if a markup/reserve feature is wanted later, re-add with UI (was never wired).

---

## ▶ RESUME HERE — state as of 2026-09-11 (read this first)

Big session. All pushed to `main` (both repos auto-deploy). `next build` + backend `tsc` green after each change, eslint clean. i18n added to sv/nb/ru for every new string (EN is the source key).

### 1) Financial planning / cash-flow module (NEW) — see memory `project_financial_planning`
- **New page `/company/invoicing/planning`** (+ `/admin/...`), sidebar «Financial planning» (Ekonomiplanering) in Economy group, `src/features/planning/`.
  - `FinancialPlanningPage.jsx` — now a **block layout** (drag+hide, shared `BlockGrid`/`useBlockLayout`/`BlockCustomizer`, `planningBlocks.js`, storageKey `byggexp.planning.layout.v1`): blocks = KPIs, Reminders&scan (drag-drop zone), Liquidity forecast (13-wk, reuses `CashflowBlock`), Upcoming payments (AP), Upcoming receipts (AR).
  - AP = unpaid supplier invoices; AR = customer invoices (sent/overdue/paid). Helpers `planningUtils.js` (`upcomingPayments/Receipts`, `planningSummary`, `manualToSupplier/Customer`, `cleanOcr`). `PaymentDetailDrawer.jsx` = row drawer w/ copy OCR/Bankgiro + mark-paid/reminder.
  - **Manual entries** (backend module `planning-entries`, `usePlanningStore`): add/delete rows in both tables; **bulk add** (`BulkPlanningModal.jsx`); merged into lists/KPIs/forecast as pseudo-invoices. Every row has ✕: manual → deleted, invoice-derived → **hidden** (localStorage `byggexp.planning.dismissed`, restore via «Show hidden»).
  - **Drag&drop scan intake** = `BulkScanInvoiceModal` w/ `allowDirection`: «Invoice to pay» (creates supplier invoice) OR «Invoice to collect» (outgoing invoice → manual receipt via `onSaveReceivables`).
  - **Project column** shown per row (fetches /projects id→name).
  - **Reminders**: client-side lead-days in the bell (`useNotifications` extended). Server-side **cron** `SupplierInvoicesService.remindUpcomingPayments` (daily 07:00, pushes admins) — **inert unless `PAYMENT_REMINDERS_ENABLED=true`** + push tokens.
- **Budget page (NEW)** `/company/invoicing/budget` — monthly plan-vs-actual (12 rows × plan/actual income+expense + result) + grouped bars (`BudgetBars.jsx`), per-year. Backend module `budget` (`GET/PUT /budget?year=`). `budgetStore.js`, `budgetUtils.js`.
- **Backend**: supplier-invoice schema+DTO gained `ocr`/`bankgiro`/`plusgiro`; scanner (`scanning.service.ts`) extracts them + a `vatExempt` flag (insurance/momsfria → 0% VAT, no 25% backfill). **AR påminnelse**: `POST /invoices/:id/reminder` (`reminder-math.ts` = dröjsmålsränta referensränta+8% + 60 kr; env `REFERENCE_RATE_PERCENT`=2 CONFIRM, `REMINDER_FEE_SEK`=60), `MailService.sendReminderEmail` (Swedish, inert w/o SMTP), `lastReminderAt`/`reminderCount` on invoice.
- **Module registry gotcha**: any NEW economy page key MUST be added to backend `company/modules.ts` `TOGGLEABLE_MODULES` (+ tiers) or the sidebar item flickers in then hides. Added `planning`+`budget`.
- **STILL DEFERRED (only #1 of P1)**: **ISO 20022 `pain.001`** bank payment file («select invoices → betalfil → mark sent»; user uploads to bank, NEVER initiate). User is checking with the bank first. Legacy Bankgirot LB dies through 2026 → build pain.001, version-swappable.

### 2) Projektkalkyl → flexible income/expense LEDGER — see memory `project_projektkalkyl`
User chose «extend the calculator» over a new module. Added to `ProjektkalkylDetailPage.jsx`:
- **Currency** per calc (`currency` field; top-bar Select; totals use `formatMoney`, row cells `formatAmount` no suffix).
- **Project link** (`projectId` field; top-bar «Pull from project» Select) → shows read-only **«From the project»** preview (real invoices/supplier-invoices/expenses), NOT counted in totals; **«Copy to table»** button turns rows into an editable gross-mode table; ✕ closes the preview.
- **Scan receipts into rows** — per-table Scan button + **drag&drop of one OR MANY files** onto a table (parallel OCR → one row each); gated on `/scan/status`.
- **VAT modes**: per-table toggle «Belopp inkl./exkl. moms» (auto-adds «Amount excl. VAT» computed column); profit is **VAT-neutral** (net income − net expense).
- **Header decluttered**: title + Scan + **⚙ settings popover** (VAT rate, amount mode, colour, import/Excel, move up/down, delete). Removed Påslag/Reserv %.
- Hover affordances (list rows clickable, table titles editable); date placeholder `yyyy-mm-dd`; sticky Save.

### 3) Shared / cross-cutting — see memory `project_design_system`
- **`AdminTable` `onRowClick`** — one shared clickable-row affordance (pointer + hover, guarded against action/checkbox clicks) + `admin-link-cell` class to highlight the primary column. Wired: Offers, Invoices, Purchase invoices, Expenses, Clients, Projektkalkyl.
- **BlockGrid width control** — `useBlockLayout` now stores per-block size overrides; `BlockCustomizer` shows a Half/Wide toggle so two blocks can pair in one row (dashboard, project overview, planning).

### 4) Bug fixes this session
- **Bulk scan duplicated files** (Ant Dragger `beforeUpload` fires per-file) — fixed in all bulk-scan modals + planning dropzone.
- **Site map**: hide 0-worker pins (`SiteMapPage.jsx`).
- **Hours** (`HoursPage.jsx`): (a) selection Fill box shows the actual **sum of selected hours** (mirrors summary, basis-aware); (b) **Planned view shows planned only** — `valOf` no longer falls back to GPS/actual (a cell with no plan shows «·», stops GPS inflating planned totals).
- **Schedule** (`SchedulePage.jsx`): (a) **ResizeObserver** dispatches window resize so `react-calendar-timeline` refills width when the sidebar collapses (was white gap); (b) **adaptive day-header** labels via `intervalRenderer` (full ≥40px / date ≥14px / blank, fallback full if width unknown); (c) «Plan for» toggle order → **Projects, Staff**.
- **Project form**: sticky «Save changes» bar (`.project-settings-tab__actions` sticky bottom).

### NEXT STEPS (2026-09-11)
1. **pain.001 bank payment file** (only remaining P1) — after user talks to the bank. Backend endpoint: select supplier invoices → generate ISO 20022 `pain.001.001.03` XML (version-swappable) with OCR/bankgiro/plusgiro → mark «sent to bank». Frontend action on the planning AP table. NEVER initiate transfers.
2. **Activate cron/reminders** (user-side): `PAYMENT_REMINDERS_ENABLED=true`, `REFERENCE_RATE_PERCENT` (confirm current Riksbank rate), SMTP for påminnelse emails, `ANTHROPIC_API_KEY` for all OCR/scan.
3. **Projektkalkyl polish**: PDF/Excel export + public share view still use `formatSek` (not the calc currency / gross mode); scanned row could attach the source file; auto-seed a linked project's actuals as editable rows on demand.
4. **Budget**: optional «Result (plan)» column; pull plan from Projektkalkyl; daily drill-down like the user's Google Sheet.
5. **Planning**: optional 13-wk liquidity «lowest-point» alerting; duplicate-detection at capture already exists for supplier invoices — consider for receivables.

---

## ▶ RESUME HERE — state as of 2026-09-08 (read this first)

**2026-09-08 (v2) — Projektkalkyl redesigned into a BUDGET BOARD** (both repos → `main`,
per user Excel mockup): two columns **доходы (left) / расходы (right)**, each side = many
**named, coloured tables** (presets: Частные клиенты yellow+moms / Строй фирмы green+utan /
Материалы blue+moms; + «+ таблица» custom). Per table: **custom columns** (rename/add;
one Amount column drives totals), **vat flag** (Med moms 25% / Utan moms → auto 25% on the
Amount column), add/**move ↑/↓**/delete for rows AND tables, per-table subtotal, and a
**green/red side TOTAL** (netto + moms = brutto) + live Result at top. Backend model changed
flat `rows[]`→`tables[]` (Mixed JSON, `markModified`). Front: `kalkylModel.js` (colors,
presets, `tableTotals`/`sideTotals`/`moveInArray`), rewritten `ProjektkalkylDetailPage`
(inline `Side`+`KalkylTable`), ListPage result now income−expense from tables; 9 new i18n
keys ×10 dicts. Q&A decided: custom columns / auto-25%-VAT+flag / arrows / presets.
**Deferred (user «потом»):** collapse long tables (show last 10, expand on click) + a
«прогресс» block below. `nest build`+`next build` green, eslint clean.
**User feedback round (2026-09-08) — ALL DONE, pushed:** (1) both side TOTALs pinned to the
bottom on the same level (columns `align-items:stretch` + TOTAL `margin-top:auto`) + a
full-width **Profit bar** (income−expense) under them. (2) «+ таблицу» opens a **config modal**
(name + С/Без НДС + color). (3) **collapse** long tables (>12 rows → last 10 + «Показать все»/
«Свернуть»). (4) **Excel/CSV import** on expense tables via **SheetJS `@e965/xlsx`**
(`src/features/projektkalkyl/excelImport.js`, fuzzy sv/en/ru headers → Description/Date/Amount).
Research decision: board stays native (grid libs don't fit multi-table layout / Handsontable+AG-advanced are paid); only Excel uses a lib.
**Also done 2026-09-08:** Note moved LEFT of Profit (same-height row); Profit bar aligned under the Expenses column width; section name «Projektkalkyl» localized in all 10 dicts (ru «Калькуляция проекта»); **Excel EXPORT** (`excelExport.js`, SheetJS → .xlsx with tables/subtotals/totals/profit, «Export» button); **Progress/health panel** below the board (income/expense bars = cost as % of income, margin %, cost share, profit) — user picked «здоровье проекта» over target/budget variants. **Public share link + live (2026-09-08):** «Share» button → `POST /projektkalkyl/:id/share`
mints a random `shareToken` + `shareExpiresAt` (**1h self-destruct**), modal with copy/
valid-until/revoke (`DELETE :id/share`). Public `@Public()` controller
`GET /projektkalkyl-public/:token` returns a read-only snapshot (name/note/tables only,
never companyId/ids) while unexpired. Admin: **autosave** (debounced 1.5s) so a viewer sees
edits; public page **`app/kalkyl/[token]`** (no login, outside ProtectedRoute) renders a
read-only board and **polls every 4s = live**. Also: uniform cells (`table-layout:fixed` +
small amount input), collapsible Progress panel. Live is poll-based (~4s); instant would need
WebSocket/SSE (deferred). 10 new i18n keys ×10 dicts.
**Advanced table + discussion (2026-09-08, done):** «+ table» type select — **Simple** (typed
amount) or **«с умножением»** (Antal × À-pris → Belopp computed, read-only). Model: `tableColumns(type)`,
`lineAmount()` (qty×price or typed), tableTotals/export/public all use lineAmount. **Discussion:**
`comments[]` on the calc; team comments (POST :id/comments) on the detail page + **guest comments**
on the public share page (POST projektkalkyl-public/:token/comments), shared `CommentsPanel`, live
via the 4s poll. **PDF + markup/reserve (2026-09-08, done):** `GET /projektkalkyl/:id/pdf` → branded board PDF via
the invoice puppeteer launcher (`projektkalkyl-pdf.template.ts`); admin «PDF» button saves-then-
downloads. Per-table **Markup % + Reserve %** inputs → `tableTotals` = base + markup + reserve + VAT,
reflected in detail/public/export/PDF (shared math). **Whole Projektkalkyl backlog now shipped:**
board, presets, qty×price, colors, reorder, collapse, uniform cells, progress (collapsible),
Excel import+export, PDF, share-link (1h + live 4s poll), autosave, discussion (team+guest),
markup/reserve, i18n ×10. **VAT rates + per-row VAT (2026-09-08, admin request, done):** table VAT is now a rate dropdown
**25% / 12% / 6% / Без НДС** (was binary inkl25/none — old field still honored via `tableVatRate`);
each **row** has a compact «—/25/12/6/0%» override (`rowVatRate`) so one table can mix rates
without a full column. `tableTotals` sums VAT per row (+ markup/reserve at the table rate);
detail/public/export/PDF all use the shared helpers.
**Projektkalkyl remainder 1→2→3 (2026-09-08, done):** (1) **instant live via SSE** — in-memory
`changes$` Subject emits on every save (update/comment); public `@Sse projektkalkyl-public/:token/stream`
pushes a fresh snapshot instantly; public page uses EventSource + keeps an 8s poll fallback. ⚠️ SSE
needs the reverse proxy to not buffer (`proxy_buffering off`); if buffered it degrades to the 8s poll —
verify on prod. (2) **downloadable Excel import template** — «Download import template» button on expense
tables writes an .xlsx with the exact headers (Beskrivning/Datum/Belopp) so import is reliable without a
sample. (3) **calc templates** — `isTemplate` flag (excluded from list); detail «Save as template»,
list «From template» dropdown → new calc from a template; endpoints GET templates / POST
:id/save-as-template / POST from-template/:id. i18n ×10 for all. **Projektkalkyl fully complete.**

**2026-09-08 (v1) — NEW module «Projektkalkyl» (both repos → `main`):** standalone manual
project calc/budget sheet, independent of operational projects (user: «сел, посчитал
проект в системе, а не в Экселе»). BackEnd `ByggExp-BackEnd/src/projektkalkyl/` (schema
rows[]{description,type income|cost,category,amount} + momsMode + name/note; company-scoped
CRUD `/projektkalkyl` under FINANCE_MANAGE; registered in AppModule; key `projektkalkyl`
added to `company/modules.ts` TOGGLEABLE + tillväxt tier). Admin `byggexp-admin`:
`src/store/projektkalkylStore.js` (+ pure `kalkylTotals`), `src/features/projektkalkyl/`
ListPage (AdminTable, «Ny kalkyl» creates+opens) + DetailPage (editable rows table via
antd Input/Select/InputNumber, live **Summa intäkter/Summa kostnader/Resultat/Marginal %**,
ex/inkl-moms Segmented, note, Spara). Routes `app/{company,admin}/projektkalkyl/[id]`,
sidebar entry (Ekonomi, CalculatorOutlined), `shared/config/modules.js` Economy group,
i18n: 12 new keys in ALL 10 dicts. `next build` + `nest build` green, eslint clean.
NEXT (follow-ups): export Excel/PDF; optional hybrid auto-seed from invoices/expenses;
duplicate-kalkyl action; per-row VAT if needed.

## ▶ RESUME HERE — state as of 2026-09-07

### NEXT STEPS — verify the 2026-09-07 batch first (pick up here)
All items below shipped to `main` (both repos auto-deploy; VPS rebuilds ~2 min after each push — the site may briefly lag during a backend build). Hard-refresh admin with Cmd+Shift+R; **regenerate/re-download a PDF** to see PDF changes.
0. **Invite / magic sign-in (BackEnd):** click the invite email's "Bekräfta e-post…" → the "Öppna ByggExp" button no longer 404s (`/app/magic` now exists); an invited **companyAdmin/projectAdmin** sees the **app-vs-webadmin choice** page, a **worker** goes straight to the app. (Real emails need SMTP configured in prod.)
1. **Invoice/offer emails:** cover message is **always Swedish** regardless of UI language; **offers now have "Send by email"** in the offers list (modal like invoices).
2. **Invoice PDF:** dates on one line; "Alexander Gerhard" (Er referens) on one line; **footer (Adress/Telefon/Organisationsnr/Momsreg.nr/E-post) fills from the live company** even on invoices created before the company was filled.
3. **Company details form:** fill fields → upload a logo → **fields are NOT wiped** anymore.
4. **UI polish (admin, verify in dark mode):** active wizard step tab is light (not blue); row-select checkbox check is visible; superadmin **Companies page is localized** (RU etc.); the **admin value-tour slideshow is gone** (app-only).

### OPEN / follow-ups
- **Worker not seeing an assigned project in the mobile app** (`demo@byggexp.se` on "Byggmästarvägen BRF 200"). Backend query looks correct (`/projects/my` matches `workers` OR `projectIds`; demo is in the team ⇒ projectIds has it) → likely **app cache/stale session**: have demo pull-to-refresh / re-login. If still missing, capture the app's `/projects/my` response or check demo's `projectIds` in Atlas (can't reach the DB from here — IP not whitelisted).
- **SMTP in prod** still needs to be configured for invite/invoice/offer emails to actually send (otherwise the API logs "SMTP not configured, skipped" and returns `sent:false`). See [[project_pending_activations]].
- If **offer email** should follow company country (NO → Norwegian) later, mirror the note in [[feedback_outgoing_comms_swedish]] (default stays Swedish).

**2026-09-07 (invoice/offer PDF: date wrap + empty footer, BackEnd → `main`):**
- **Dates wrapped to two lines** in the invoice PDF header meta ("2026-09-\n07"). The date `<dd>` cells in the header `<dl>` had no nowrap. Fixed in `ByggExp-BackEnd/src/invoices/templates/invoice-pdf.template.ts` — added `class="nowrap"` (existing global `.nowrap{white-space:nowrap}`) to the Fakturadatum / Leveransdatum / Förfallodatum values. Same fix in `src/offers/templates/offer-pdf.template.ts` (Datum / Giltig till, inline `white-space:nowrap`). Names (e.g. "Alexander Gerhard") can still wrap.
- **Invoice header refs wrapped ("Alexander\nGerhard")** despite free space. The `.invoice-header__details` row reused the top band's **3-column** grid (`1.15fr 1fr 0.95fr`) but only has two ref blocks → the empty right third cramped the first column and wrapped short values. Gave `.invoice-header__details` its own **2-column** grid (`1fr 1fr`, gap `20px 48px`) and set `.invoice-header dd { white-space: nowrap }` (meta values are short refs/numbers/dates). Verified by rendering the template to PNG via the backend's puppeteer — name + dates now single-line. (Preview: `~/Desktop/faktura-header-preview.png`.)
- **Invoice footer (Adress/Telefon/Organisationsnr/Momsreg.nr/E-post) was blank** even after filling company details. Cause: `companyFooter` is snapshotted at invoice creation; an invoice created BEFORE the company was filled had an empty snapshot, and only logo + giro had a live fallback. Extended the fallback in `invoices.service.ts buildInvoiceHtml`: when any footer field is blank, load the live company once and fill **only the missing** fields (name/address/city/phone/email/website/orgNumber/vatNumber/vatStatus/bankgiro/plusgiro). Fixes old invoices too; offers already resolve the footer live at render so they were fine. `nest build` green.

**2026-09-07 (company form: logo upload no longer wipes edits):**
- **Bug:** on the company details form, filling in fields and THEN uploading a logo erased all unsaved edits (had to retype everything). Cause: `uploadLogo` writes the saved company doc back into `currentCompany` (store), and `CompanyDetailsForm`'s `useEffect([currentCompany])` re-ran `companyForm.setFieldsValue(...)` on every `currentCompany` change → overwrote the in-progress edits with the pre-edit server values. (Not a real page reload — a form re-seed.)
- **Fix** (`src/features/profile/CompanyDetailsForm.jsx`): seed the form **once per company** via a `seededCompanyRef` guard (compare `getEntityId(currentCompany)`); later `currentCompany` updates (logo upload) skip re-seeding, so edits survive. Logo preview still updates (it reads `currentCompany.logoUrl` directly). `next build` green.

**2026-09-07 (send offer by email, both repos → `main`):**
- **Offers can now be emailed to the client like invoices.** Mirrored the invoice send flow end-to-end.
  - **BackEnd** (`ByggExp-BackEnd`): `mail.service.ts` new `sendOfferEmail(to, {offerNumber, senderName, validUntil, message, pdf})` — Swedish body (Hej / "Bifogat finner du offert N från …" / "Giltig till: …" / "Med vänliga hälsningar"), PDF attached as `offert-N.pdf`, log-only when SMTP unconfigured. `offers.service.ts` new `sendByEmail(id,user,email?,message?)` — builds the PDF via existing `buildOfferPdf`, resolves sender name from `resolveCompanyFooter`, sends, and flips `Draft→Sent`. `offers.controller.ts` new `@Post(":id/send")` (`FINANCE_MANAGE`). `offers.module.ts` now imports `MailModule`; `OffersService` injects `MailService`. `nest build` green.
  - **Admin** (`byggexp-admin`): `offerStore.js` new `sendByEmail(id,{email,message})` → `POST /offers/:id/send` (Swedish toasts, refetch). `OfferListPage.jsx` gained a "Send by email" row action (MailOutlined) + the same send modal as invoices (recipient email prefilled from `record.email`, editable cover message, PDF-attached note), return wrapped in a fragment. **Cover message default is a Swedish literal** ("Tack för din förfrågan! Bifogat finner du vår offert. Hör gärna av dig vid frågor.") per the always-Swedish outgoing-comms rule.
  - **i18n:** added `Send offer by email` + `The offer is attached as a PDF…` to all 10 dictionaries (other keys — Send by email / Send / Recipient email / Message (optional) — already existed). `next build` green.

**2026-09-07 (invoice email language, pushed to `main`):**
- **Invoice cover email is now always Swedish, regardless of the admin's UI language.** The invoice send-modal pre-filled its accompanying `message` via `t('Thank you for your business! …')`, so a Russian-UI admin sent a Russian line inside an otherwise Swedish email (body is hardcoded SV: Hej / Bifogat finner du / Förfallodatum / Med vänliga hälsningar). User rule: **inter-company communication is always Swedish**; the UI language is only for personal/internal use. Fixed in `src/features/invoicing/InvoiceListPage.jsx` — the default message is now the Swedish literal `'Tack för förtroendet! Vänligen betala fakturan senast förfallodatum. Hör gärna av dig vid frågor.'` (admin can still edit it in the modal). The i18n key stays in the dictionaries (harmless). NOTE: offers have no email-send feature yet (only invoices are emailed via `mail.service.sendInvoiceEmail`); if offer email is added later, keep the cover text Swedish the same way. `next build` green.

**2026-09-07 (BackEnd, pushed to `main`):**
- **Magic sign-in link 404 fixed** (`ByggExp-BackEnd`). The invite email → `/auth/verify-email` page shows an "Öppna ByggExp" button pointing to `https://api.byggexp.se/app/magic?code=…`, which returned **404 "Cannot GET /app/magic"**. Root cause: the `appMagic` handler was declared inside `@Controller("auth")`, so it registered at **`/auth/app/magic`**, while every generated URL (`magicRedirectHtml`/`chooseDestinationHtml`/`appMagicFallbackHtml`) AND the Apple `apple-app-site-association` + Android `assetlinks.json` config all claim top-level **`/app/magic*`**. Moved the `GET /app/magic` route to `AppController` (`@Controller()`, no prefix); exported `appMagicFallbackHtml` + `errorHtml` from `auth.controller.ts` for it. `web-magic` was already correct (`/auth/web-magic`).
- **Invited admins now get the app-vs-webadmin choice after confirming.** Previously only the company-registration flow (`register-company/set-password`) showed `chooseDestinationHtml` ("Öppna appen / Öppna webbadmin"); an invited companyAdmin/projectAdmin hitting `verify-email` only got the app button. Now `verifyEmail` returns the user's `role` and the controller serves `chooseDestinationHtml` for companyAdmin/projectAdmin/superadmin, `magicRedirectHtml` (app-only) for workers. `nest build` green; the two edited controllers are eslint-clean (other files have pre-existing lint that doesn't block `nest build`).
- **OPEN — worker not seeing an assigned project in the mobile app** (`demo@byggexp.se`, worker on "Byggmästarvägen BRF 200"). Backend query looks correct: mobile `/projects/my` + `/projects/my/populated` match `{ workers: userId }` OR `{ _id: { $in: user.projectIds } }`, and the admin team list (`findAllByProject`) matches strictly `{ projectIds: projectId }` — since demo shows in the team, demo.projectIds already includes the project, so `/projects/my` should return it. No company filter on those paths. ⇒ Likely **app-side cache / stale session** (pull-to-refresh or re-login) rather than backend. Couldn't confirm against the DB (Atlas IP not whitelisted here). NEXT: have demo re-open/refresh the app after this deploy; if still missing, capture the app's `/projects/my` response or check demo's `projectIds` in Atlas.

**2026-09-07 (follow-up, pushed to `main`):**
- **Removed the admin "value tour" modal** (the 🚀 "Projekt & team på minuter" 6-slide welcome shown on first company-admin login). User wants that value/intro slideshow to live **only in the mobile app**, not the admin. Deleted `src/features/onboarding/ValueTour.jsx` + its mount/import in `src/shared/layouts/DashboardLayout.jsx` (`{section === 'company' ? <ValueTour/> : null}`). Was the only usage (`openAdminValueTour` had no callers), so no re-open button to clean up. `next build` green. (The dashboard onboarding checklist + wizard gate are untouched — only the passive slideshow modal is gone.)
- **Superadmin Companies page was hardcoded English on non-EN languages** (RU etc.): the whole `src/features/companies/CompanyListPage.jsx` used literal strings instead of `t()`. Wrapped all of them — column titles (Name/Address/Email/Plan), the Add-company button (`useAddButton`), row-action labels (Edit/Modules/Delete + delete-confirm), modal title (Edit/Create company), save button (Save/Send), and the delete toasts (Company deleted / Failed to delete company). Most keys already existed in all 10 dictionaries; added the **6 missing keys to every dictionary** (`src/i18n/messages/{sv,nb,ru,pl,uk,fi,et,lt,lv,bs}.js`): `Add company`, `Edit company`, `Delete company?`, `Company deleted`, `Failed to delete company`, `Registration requests` (the last is the sidebar nav item, already routed through `t(item.label)` in `DashboardSidebar.jsx`). `next build` green + eslint clean. NOTE: the app now supports **10 languages** (memory said SV/EN/NB — stale); new strings must go in **all** `messages/*.js`.
- **Row-select checkbox checkmark invisible in dark mode** (superadmin Companies table + all `AdminTable` lists). The custom `.admin-table-checkbox` (`AdminTableCheckbox.jsx`, styled in `src/styles/components/_tables.scss`) fills the checked state with `$color-text-primary` (dark navy) + a white `::after` check — on the dark page the navy fill blends into the background so the check disappears. Added a dark-mode override in `src/styles/themes/_dark.scss`: empty box = `transparent` bg + `$muted` border; **checked/indeterminate = bright app blue `#2683f9`** so the white check/dash reads clearly. `sass` compile clean. (Note: `_dark.scss` has no `tokens.` namespace → used the raw blue hex, same as the "Add company" button.)

**2026-09-06 (follow-up, pushed to `main`):**
- **Active wizard step tab was blue text in dark mode** (e.g. "3. График и бюджет") — dark mode overrode only the active Segmented item's *background*, not its color, so it inherited the blue `--seg-accent`. Fix in `src/styles/themes/_dark.scss`: `.ui-segmented__item.is-active` now also sets `color: $text` → light text, matching the rest of the wizard. (Base is `src/ui-kit/Segmented/Segmented.scss` where `.is-active { color: var(--seg-accent) }`.) `sass` compile clean.

**2026-09-05 → 06 session (all pushed to `main`, auto-deployed; every step `next build`-green + eslint-clean):**

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

### NEXT STEPS — verify this 09-05→06 batch first (pick up here)
0. **Verify live on admin.byggexp.se** (Cmd+Shift+R; these all shipped this session):
   - **Wizard step tabs (dark mode):** the active step ("1. Основные данные"/"3. График и бюджет") is now **light text, not blue**.
   - **Row-select checkbox (dark mode):** checked box is **blue with a visible white check** (was dark-navy fill → check invisible); works on any `AdminTable` list.
   - **Language pickers** (header + Add-worker invite): Svenska/Engelska/Polska first, then A→Ö; all Swedish names (Ryska etc.); Svenska pre-selected.
   - **Project create/edit form (dark mode):** "Use location as name" **toggle visible**; **no "‖" bars** in Сотрудники/Инструменты selects; **Enter** in text fields advances the step / creates on the last; work-day time fields **not required**; **clearing a time + save persists empty** (`enabled:false`, blank on reload — check a saved project reopens blank, and its Hours grid has no planned baseline).
   - **Onboarding wizard:** on a company with 0 projects/1 user it shows **0/4** (matches the dashboard checklist); done-marks are **green circle badges**; creating a project/worker in the wizard flips its step done; deleting it un-flips.
   - **Create user → Details step:** the "An invitation email will be sent…" note is gone.
1. **Verify** the full wizard flow with a fresh company (private window): invite page is Swedish; routing → **each step opens a modal in place** (project → team → task → tools → company → client → article), auto-advances on create, `billing` navigates to the offer builder; hand-off between tracks; **backdrop click / "Skip for now"** → Resume bar; nested "+ New client/worker" inside the project form renders on top of the gate.
2. **Per-step short instructions / demo** (Наталья: «для каждой ещё инструкцию» + «демо видео если хочешь — тоже супер»). Could add a small help blurb or looping GIF/video per stage in the wizard right panel.
3. **`billing` step still leaves the wizard** (full-page `OfferCreatePage`). Options: a lighter "first invoice/offer" modal, or accept the navigation (it's the last step).
4. **Optional:** group the skip-track (focus='skip', all 8 steps) under Operations / Get-paid subheads; refresh `docs/research/onboarding-benchmark.md` with the wizard-gate design.
5. Older idea still open: safe client-side **demo/preview** data so the empty product looks fuller (vs a DB seed).
6. **Optional follow-ups opened this session:** (a) add **es/pt/fr app dictionaries** (+ antd locales + `SUPPORTED_LANGS`) so the invite languages Spanska/Portugisiska/Franska aren't English-fallback, then also surface them in the header switcher; (b) wizard `team` step counts a **demo/seed worker** as "team added" (`teamCount > 1`) — exclude seed users explicitly if that's unwanted.

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

---

## SESSION 2026-09-21 — Deploy resurrected (backend hadn't shipped since Sep 20) + partial credit UI

**Symptom:** Geal tapped an "Obetald faktura" push → app had "no screen" for it. Root cause was NOT the app — the whole supplier-invoices/credit/attach-files/projektkalkyl-currency backend had not deployed since Sep 20 (last green = run #358).

**Why the deploy was dead:** `deploy.yml` added a non-blocking e2e step, but `test/app.e2e-spec.ts` created a full Nest app (ScheduleModule cron timers + open Mongoose connection) in `beforeEach` and never closed it → jest (no `--forceExit`) never exited → the CI job ran to GitHub's 6h timeout. `continue-on-error` does NOT catch a hang. Worse: that hung job (#362, 13:58Z) held the `deploy-byggexp-api` concurrency slot, so every later push queued behind it and got superseded/cancelled — nothing could deploy.

**Fix (pushed, backend commit acc4e0a):**
1. `afterEach(() => app.close())` in app.e2e-spec — kills the leak.
2. Defense-in-depth in deploy.yml: e2e runs `--forceExit`, step `timeout-minutes: 10`, job `timeout-minutes: 30`.
3. Cancelled the 6.5h hung run #35609047672 via `gh run cancel` to free the concurrency slot.

**Result:** run #370 went green end-to-end (e2e step now takes 9s, not 6h; "Deploy on VPS" ✓). Prod verified: api.byggexp.se → 200, deployed commit = acc4e0a. Admin repo also green (515eded). Everything backed up since Sep 20 is now live.

**Also this session:** outgoing invoices got the same partial-credit modal as supplier invoices (InvoiceListPage + invoiceStore, empty = full credit, amount = partial; SV/NB/RU string added).

**STILL OPEN:** mobile app — the "unpaid-bill reminder opens the bill" flow (commit 2273c5e7 in tot-bygghub-mobile-app-ios) is committed but needs an OTA publish to reach Geal's phone: `eas update --branch production`. Code is done; it's a publish, not a bug.

### ▶ NEXT STEPS (продолжить отсюда — 2026-09-21 конец сессии)

**Состояние сейчас: деплой почин, оба репо зелёные и на последнем коммите.**
- Backend HEAD `acc4e0a` задеплоен (api.byggexp.se → 200). Admin HEAD `515eded` задеплоен.
- Деплой больше не зависает: e2e-шаг ~9с, есть таймауты (шаг 10м / job 30м).

1. **[ЖДЁТ ТЕБЯ] Mobile OTA** — единственный незакрытый пункт по «уведомление → фактура».
   Код в `tot-bygghub-mobile-app-ios` готов (commit `2273c5e7`), нужен паблиш:
   `cd tot-bygghub-mobile-app-ios && eas update --branch production`
   Перед этим убедиться, что билд на телефоне Geal на `runtimeVersion 1.1.0` (иначе OTA не применится → тогда нужен новый TestFlight-билд 1.1.2). После паблиша — тапнуть push, проверить что открывается SupplierInvoicesScreen с нужной фактурой.

2. **Проверить живьём** новый функционал теперь, когда бэкенд доехал:
   - Исходящие фактуры → «Skapa kreditfaktura» → модалка частичного кредита (пусто=весь / сумма excl. moms=часть).
   - Счета поставщиков: кредит полный/частичный.
   - Projektkalkyl публичная ссылка: валюта (NOK/EUR, не зашитый SEK).
   - Cron `payment-reminders` (08:00) шлёт «Obetald faktura» админам компании.

3. **Если деплой снова закапризничает** — теперь есть `gh` (залогинен в keyring):
   - `gh run list --workflow="Deploy to VPS" -L 5` — посмотреть статусы.
   - Зависший/висящий job держит `concurrency`-слот → отменить: `gh run cancel <id>`.
   - Логи упавшего шага: `gh run view <id> --log-failed`.
   - Последний зелёный эталон: run #370 (`acc4e0a`).

4. **Хвост из прошлых сессий (не срочно):** включить React Compiler глобально (тогда убрать ручную мемоизацию KalkylTable); Bankimport крупные фичи (bulk-категоризация / split строк); UX-проход Schedule + Hours-grid; остаток autoSafe dup-хелперов.
