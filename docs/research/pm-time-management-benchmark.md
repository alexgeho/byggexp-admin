# Benchmark — Project & Time Management segment (ByggExp)

> **STATUS: research klar (2026-08-30).** Deep-research kört (23 källor, 108 påståenden, 24/25 3-röst-verifierade). Sektion 2–7 ifyllda. Nästa steg: diskutera prioriteringarna i sektion 4 med Alexander och besluta vad som byggs.

## 🧭 Handoff (read me first — for the next agent)

**Vad:** Alexander (grundare, ByggExp — allt-i-ett-app för svenska/nordiska byggföretag) vill förbättra
**projekt-/uppgifts-/tidshanterings-segmentet** av produkten. Uppgiften: research världens bästa/mest
populära/effektiva PM- & produktivitets-verktyg, jämför med vad ByggExp redan har, och föreslå prioriterade
förbättringar. Detta är ett **diskussionsunderlag** — inte ett byggbeslut ännu.

**Scope (bekräftad 2026-08-30):**
- IN: Uppgifter/Mina uppgifter (task planner), Goals, Projekt, Bemanning, Planering, ⌘K-palett, Översikt/dashboard.
- UT: tidrapport/Hours-grid/lön/faktura (separat, redan väl utbyggt — se memory `project_hours_tool_spec`).

**Jämförelse-set:**
- Generella PM/produktivitet: Asana, Monday.com, ClickUp, Notion, Linear, Todoist, Motion, Sunsama, Reclaim.ai, Trello, Jira.
- Bygg-specifika: Bygglet, Fieldwire, Procore, Buildertrend, Fonn, Next (Norge).

**Var saker finns:**
- Denna rapport: `byggexp-admin/docs/research/pm-time-management-benchmark.md`
- Admin-repo features: `byggexp-admin/src/features/{tasks,goals,projects,bemanning,dashboard,shifts}`
- Konkurrent-gap redan kartlagt i memory: `project_bygglet_roadmap`, `project_remato_gaps`, `project_trinax_gaps`.

---

## 1. Nuläge — vad ByggExp redan har (project/task/time-segmentet)

*(sammanställt från memory + kodbas 2026-08-30 — verifiera mot koden vid tveksamhet)*

**Uppgifter / Mina uppgifter (task planner)**
- Personlig "inbox" av mina uppgifter, prioriteter, förfallodatum.
- Naturligt-språk-datum vid inmatning (SV/EN/RU), t.ex. "imorgon", "på fredag".
- ⌘K command palette (snabbnavigering/kommandon).

**Goals (mål-nedbrytning)**
- Flik "Goals" per projekt: mål → N delsteg (stages) → riktiga uppgifter, med live %-ring.

**Projekt**
- Team-modell: workers[] + projectAdmins[] (roller separerade).
- Projektekonomi (kostnad/intäkt), Dagbok (bygg-dagbok), KMA/egenkontroller, ÄTA, Betalningsplan (à conto).

**Bemanning (staffing)**
- Veckovis grid (arbetare × dagar) för att planera vem som jobbar var.

**Planering** — schema/kalender-vy (verifiera exakt funktion i koden).

**Översikt / dashboard**
- Anpassningsbar Overview (dölj/dra block, per användare), mörkt läge, onboarding-checklista, in-app Hjälp.

**Tid (utanför scope men angränsande):** Arbetspass (GPS/manuell), Hours-grid → faktura/lön, tidrapport-export.

**Kända styrkor:** djup bygg-domän (ROT, ÄTA, KMA, personalliggare), tid→lön/faktura i ett flöde, i18n (SV/EN/NB).
**Öppna frågor att undersöka:** hur står sig UX/AI/automation för själva task- & tidsplaneringen mot 2025-2026 best-in-class?

---

## 2. Extern landskap (deep-research 2026-08-30 — 23 källor, 108 påståenden, 24/25 verifierade 3-röst adversariellt)

### A. Bygg-PM i Norden — de har redan gått förbi vår staffing-grid

**Bygglet (SE)** — närmaste konkurrenten och tydligaste förebild:
- **Resursplanering** = drag-and-drop-KALENDER som schemalägger **både enskilda arbetare OCH hela arbetslag samtidigt**, jämte frånvaro/semester. `hög konfidens` [B1]
- **Pushar schemat direkt till medarbetarnas mobilappar** så fältarbetare ser "vilka projekt som är aktuella för dagen eller veckan". `hög` [B1] ← **detta är den viktigaste funktionen att kopiera**
- **Projektplanering** = Gantt-tidsplan med smart drag-and-drop, månads-/årskalender, **delmoment (subtasks) som visar beroenden och den kritiska linjen**, och kopplat till resursplanering så sjukdom/ÄTA → enkel dra-och-släpp-omplanering. `hög` [B2]

**Next (Next One Technology, SE/NO)** — starkaste tidsplan-benchmark:
- **Gantt- och översiktsvy**, tidsplaner byggda från **mallar eller tidigare projekt**, **milstolpar och deltider**, samt **resurstilldelning efter tillgänglighet** (personal, maskiner, material, semestrar, hyresfrister för utrustning). `hög` [N1]

> **Slutsats bygg-PM:** ByggExps *Goals → stages → tasks med %-ring* är INTE en schemaläggbar Gantt med resurs-efter-tillgänglighet. Både Next och Bygglet har (a) riktig tidsplan med beroenden/kritisk linje, (b) arbetslag som schemaenhet, (c) push till arbetarens mobil. Det är där vårt gap sitter.

### B. Generella PM/produktivitets-ledare — mönster värda att låna

- **Motion** = kategoriledare för **AI-auto-schemaläggning**: användaren sätter bara *prioritet + deadline*, Motion placerar uppgifter i kalendern runt möten och **omfördelar kontinuerligt** (ASAP-uppgifter triggar omplanering), skyddar fokus-block, Google/Outlook-integration, AI-mötesanteckningar. $19–29/mån, ingen gratisplan. `hög` [M1]
  - **UX-insikt att kopiera:** lägg uppgiften *där användaren redan tittar* (kalendern/dagsflödet) istället för en separat PM-app — extra relevant för fältarbetare som inte öppnar ett planeringsverktyg av vana. `medel` [M2]
- **Reclaim.ai** = "försvarar" återkommande vanor/fokustid genom att omplanera dem runt konflikter men bevara veckans totaltimmar; auto-slottar uppgifter i öppna tider. Integrerar Todoist/Asana/Linear/ClickUp/Jira. `hög` [R1]
- **Sunsama** = medveten motsats: **guidad manuell dagsplanering** (morgonritual: välj prioriteter, tidsuppskatta per uppgift, kolla rimlighet, timeboxa) — schemalägger *inte* åt dig. Lägre risk-mönster för vår "Mina uppgifter"-inbox: ett guidat dagsplaneringssteg snarare än full automation. `hög` [S1]
- **Asana** = älskade, bygg-relevanta mönster: flera vyer (list/board/**timeline/Gantt**), **uppgiftsberoenden med kritisk väg**, **Workload** (lag-kapacitet över projekt), och regel-automation. Todoist saknar beroenden/tidslinjer. `hög` [A1]
  - **Workload = kapacitet-över-projekt** är den direkta analogen ByggExp borde lägga ovanpå staffing-griden.
- **Linear** = differentierar *enbart* på hastighet (<100ms) och tangentbords-först flöde med Cmd+K-palett → **prestanda och låg beslutsfriktion är i sig konkurrensfördelar**. Validerar vår ⌘K-satsning; läxan är att hålla interaktioner snabba och minska val för fältanvändare. `hög` [L1]
- **Notion** = kombinerar dokument/wiki/projekt med **flexibla databasvyer** (tabell/board/timeline/kalender/galleri) + Notion AI (skriva, sammanfatta, extrahera action items). Mönster: låt EN projekt-dataset renderas som list/board/timeline istället för separata moduler. `hög` [No1]

**2026-trend (verifierad):** tid-hantering delas i tre modeller — **auto-schemaläggare** (Motion, Reclaim), **guidade planerare** (Sunsama), **manuella time-blockers** (Morgen, Akiflow). **Naturligt-språk-inmatning** ("Review PR imorgon 45 min") är nu standard. `hög` [T1]
→ **ByggExp är redan i paritet på naturligt-språk-datum (SV/EN/RU) och ⌘K.** Överinvestera inte där; gapet är schemaläggning/tidsplan, inte inmatning.

### C. Fält/mobil-mönster (fetchade, men överlevde EJ full 3-rösts-verifiering — behandla som riktning, ej fastslaget)
- **Fieldwire**: varje uppgift **pinnas till en exakt plats på ritningen**; Kanban/Gantt/list-vyer; **full offline** (visa ritningar, skapa uppgifter, bifoga foton, bocka punch-items utan nät → synkar sen). Punch lists = lokaliserade åtgärdslistor.
- **Generellt fält-SFM 2026**: **offline-läge är must-have** (fyll formulär, uppdatera status, foton, tid utan uppkoppling → auto-synk).
> Se caveats: nordamerikanska bygg-verktyg (Procore/Fieldwire/Buildertrend/Fonn) är underrepresenterade — inga påståenden överlevde synteslagret.

---

## 3. Feature-by-feature gap-analys — ByggExp vs best-in-class

| Funktion | Best-in-class | ByggExp idag | Status |
|---|---|---|---|
| Naturligt-språk-inmatning av uppgifter | Todoist, Motion | Ja (datum SV/EN/RU) | ✅ **Paritet** |
| Snabb tangentbord/kommando-palett | Linear (Cmd+K) | Ja (⌘K) | ✅ **Paritet** |
| Personlig "Mina uppgifter"-inbox + prioritet | Todoist, Sunsama | Ja | ✅ Har |
| Mål/nedbrytning till deluppgifter | Asana, ClickUp | Goals → stages → tasks + %-ring | 🟡 Har (men ej schemalagt) |
| Vecko-bemanning (arbetare × dagar) | Bygglet | Ja (grid) | 🟡 Har grunden |
| **Gantt/tidslinje med beroenden + kritisk linje** | Next, Bygglet, Asana | Nej | 🔴 **Gap** |
| **Push av schema → arbetarens mobilapp** | Bygglet | Nej (grid är admin-only) | 🔴 **Gap (störst)** |
| **Arbetslag som schemaenhet** (ej bara individ) | Bygglet | Nej | 🔴 **Gap** |
| **Tillgänglighets-/semester-medveten planering** | Next, Reclaim | Delvis (Frånvaro finns, ej kopplat till plan) | 🔴 **Gap** |
| Auto-schemaläggning / auto-fyll ledig kapacitet | Motion, Reclaim | Nej | 🔴 Gap (lägre prio för bygg) |
| Workload / kapacitetsvy över projekt | Asana | Nej | 🟡 Möjlighet |
| Flera vyer på samma data (list/board/timeline) | Notion, ClickUp | Separata moduler | 🟡 Möjlighet |
| Uppgift pinnad till ritning/plan | Fieldwire | Nej | 🟡 Möjlighet (bygg-nisch) |
| Offline fält-uppgifter | Fieldwire, fält-SFM | Begränsat (mobilapp When-In-Use) | 🟡 Möjlighet |
| Mallar / återanvänd tidigare projekt | Next | Nej (verifiera) | 🟡 Möjlighet |
| Guidad daglig planering (morgonritual) | Sunsama | Nej | ⚪ Lågt (crews följer förmans schema) |

---

## 4. Prioriterade rekommendationer (för liten bygg-publik, mobil-först)

**P0 — högst hävstång, bygger på det vi redan har:**
1. **Push staffing-schemat till arbetarens mobilapp** som ett dagligt/veckovis "mina projekt"-flöde (Bygglets nyckel-differentiator). Vi HAR redan griden — det saknade ledet är att arbetaren ser sitt schema i mobilen med notis. Lägst bygg-kostnad, högst upplevd nytta. [B1, M2]
2. **Koppla Frånvaro → bemanningen**: en godkänd frånvaro ska synas som otillgänglig i staffing-griden (vi gjorde precis detta i Hours-griden — samma princip). Låg kostnad, stänger ett trovärdighets-gap. [N1]

**P1 — tydligt konkurrensgap mot Next/Bygglet:**
3. **Uppgradera projekt-Goals/stages till en riktig tidslinje**: datum-baserade staplar, **beroenden** och **kritisk linje**, drag-and-drop-omplanering. Behöver inte bli full MS-Project — Bygglets "delmoment med beroenden" är rätt nivå. [B2, A1, N1]
4. **Arbetslag (team) som schemaenhet** — planera en grupp i ett drag, inte bara individer. [B1]

**P2 — förstärkning, medelhävstång:**
5. **Workload/kapacitetsvy** ovanpå staffing-griden: vem är över-/underbokad denna vecka över alla projekt (Asana-mönstret). [A1]
6. **Tidsplan-mallar / "kopiera från tidigare projekt"** — snabbstart, återanvändning (Next). [N1]
7. **Fält-uppgifter mobilt + (senare) offline**: enkel "mina uppgifter idag på plats"-lista i arbetarappen; på sikt offline-synk (Fieldwire-mönster). [Fieldwire]

**Medvetet NEDprioriterat:**
- **Full AI-auto-schemaläggning à la Motion** — imponerande men crews följer i regel ett förmans-satt schema, inte självplanering; hög komplexitet, oklar nytta för blue-collar/mobil. Börja med *push av det manuellt satta schemat* (P0) före automation. [openQ4]
- **Sunsama-guidad dagsplanering** för Mina uppgifter — trevligt men lågt värde för samma anledning.
- **Mer på naturligt-språk/⌘K** — redan i paritet, ingen ROI.

---

## 5. Öppna frågor (för nästa research/diskussion)
- Procore/Fieldwire/Buildertrend/Fonn: fält-specifika mönster (punch lists, ritnings-förankrade uppgifter, crew-tilldelning) — inga påståenden överlevde verifiering, värt en riktad andra runda.
- Verkliga adoptions-/retentionsutfall av AI-auto-schemaläggning för blue-collar/mobil-först (ej kontorsanvändare).
- Exakt UX för Bygglets/Nexts mobila schema-feed (notiser, offline, kvittering) — avgör om vår push landar hos crews.
- Passar vår publik bättre Sunsama-guidad planering eller Motion-automation, givet att crews följer förmansschema?

## 6. Caveats (läs innan beslut)
Merparten av konkurrent-bevisen kommer från **leverantörernas egna marknads-/hjälpsidor** (Next, Bygglet) och **jämförelse-/affiliate-bloggar** (efficient.app, morgen.so, arahi.ai, temporal.day, setapp) — de fastställer att en funktion *finns och hur den positioneras*, inte implementations-djup/kvalitet. Läs allt som "X marknadsför/erbjuder Y", inte "Y är bäst i praktiken". Bygglet/Next-citat är svensk leverantörstext; "Gantt-style" är en mild tolkning av "tidsplan/timeline". Priser (Motion $19–29) och funktionsuppsättningar är färskvara. Nordamerikanska bygg-PM-ledare är underrepresenterade (inga verifierade påståenden överlevde).

## 7. Källor (verifierade)
**Primära (leverantör):**
- [N1] Next — Projektplan: https://next-tech.com/losningar/projektplan-byggprojekt/
- [B1] Bygglet — Resursplanering: https://bygglet.com/funktion/resursplanering/
- [B2] Bygglet — Projektplanering: https://bygglet.com/funktion/projektplanering/

**Jämförelse/blogg (funktions-existens & positionering):**
- [M1/M2] efficient.app — Motion vs Asana/ClickUp/Monday/Notion: https://efficient.app/blog/motion-vs-asana-vs-clickup-vs-monday-vs-notion
- [A1/L1/No1] guptadeepak.com — Top 10 PM tools 2026: https://guptadeepak.com/tools/top-10-project-management-tools-2026/
- [R1/S1] arahi.ai — Best time-blocking apps 2026: https://arahi.ai/blog/best-time-blocking-apps-and-planners-2026
- [S1] setapp.com — Motion vs Sunsama: https://setapp.com/app-reviews/motion-vs-sunsama
- [A1] morgen.so — Todoist vs Asana: https://www.morgen.so/blog-posts/todoist-vs-asana
- [T1] temporal.day — Best time-blocking apps 2026: https://temporal.day/blog/best-time-blocking-apps-2026
- Nordisk jämförelse bygg: https://maleon.se/basta-projektledningsverktyg-bygg-comparison/
- Fieldwire (fält/offline/punch, ej fullt verifierat): https://www.fieldwire.com/blog/fieldwire-vs-procore-comparison/ · https://www.jibble.io/construction-software-reviews/fieldwire-review

**Refuterat (använd EJ):** "Todoist är unikt på naturligt-språk-inmatning, Asana saknar det" — röstades ner 1-2 (Asana har det via appen).
