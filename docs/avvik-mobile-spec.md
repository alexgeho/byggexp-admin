# Avvik i appen («Meld avvik») — spec för mobilen

Status: backend + admin klara (branch `feat/avvik`). Appen: nästa butiksrelease (iOS + Android), inte OTA.
Termer: nb **Avvik**, sv **Avvikelse**, en **Deviation**. Kategori: nb HMS / Kvalitet / Miljø, sv Arbetsmiljö / Kvalitet / Miljö, en HSE / Quality / Environment. Alvorlighetsgrad / Allvarlighetsgrad: lav/middels/høy (låg/medel/hög).

## Skärmar

1. **Projekt → flik «Avvik»** (efter Material). Kort per avvik: `#nr titel`, rad 2 grå: kategori · ansvarig · frist. Badge: Åpen röd, Under arbeid bärnsten, Lukket grön (ingen blå — blå = handling). Forfalt: fristen i rött. Tom lista → bara «+».
   Lägg till via «+» i nedre panelen (som Material).
2. **«Meld avvik» (form, förebild Skapa projekt):** FieldCard 1: Tittel, Beskrivelse. FieldCard 2: Kategori (ChoiceChips `tone="soft"`), Alvorlighetsgrad (soft chips), Sted. FieldCard 3: Bilder (kamera/galleri, flera). Admin/projektadmin ser även Ansvarlig (picker) och Frist (datum). ✓ i headern först när Tittel är ifylld. Ingen hjälptext.
3. **Avvik-detalj:** fakta (prosjekt, kategori, alvorlighet, sted, meldt av · dato, ansvarlig, frist), beskrivelse, årsak, tiltak, bilder, historik (grå rader «handling · namn · tid»). Handlingar efter roll:
   - ansvarlig arbetare: Årsak, Tiltak, «Under arbeid» (status);
   - rapportör: rätta texten medan status = open;
   - admin/projektadmin: allt + **Lukk avvik** (kommentar obligatorisk) / **Åpne igjen**.
   Visa bara fält som finns i `editableFields`, knapparna efter `canManage`.
   Öppnad från push → längst ned grå «Stäng av aviseringar» (bell-off) som slår av `deviations` (som Materialbeställningar).
4. **Från dagbok / egenkontroll:** i egenkontroll-punkt med Anmärkning och i dagbok med text i «Avvik / hinder» — textlänk «Opprett avvik» → formen förifylld (`GET /deviations/prefill`).
5. **Aviseringar** (Meny → Aviseringar): ny rad «Avvik» (`deviations`), på som standard.

## Endpoints (JWT, alla roller; projektmedlemskap kontrolleras)

| Metod | Path | Notis |
|---|---|---|
| GET | `/deviations?projectId&status=open,in_progress&category&severity&responsibleUserId&overdue=true&mine=true` | lista (utan history), `number` fallande; varje rad har `projectName`, `overdue`, `canManage`, `editableFields` |
| GET | `/deviations/summary?projectId` | `{ open, inProgress, closed, overdue }` |
| GET | `/deviations/:id` | full post inkl. `history[]`, `photos[]` |
| POST | `/deviations` | `{ projectId, title, description?, category?, severity?, location?, responsibleUserId?, dueDate? (YYYY-MM-DD), source? }` — ansvarig/frist ignoreras för arbetare |
| PUT | `/deviations/:id` | ändrade fält; `status` bara `open`/`in_progress`; otillåtet fält → 403 |
| POST | `/deviations/:id/photos` | multipart `photos` (max 10, bild/HEIC) |
| POST | `/deviations/:id/close` | `{ closingComment (krävs), correctiveAction? }` — admin/projektadmin |
| POST | `/deviations/:id/reopen` | `{ comment? }` — admin/projektadmin |
| DELETE | `/deviations/:id` | bara företagsadmin (appen visar inte) |
| GET | `/deviations/responsible-options?projectId` | `[{ _id, name, role }]` för Ansvarlig-pickern |
| GET | `/deviations/prefill?checklistId&itemIndex` eller `?dagbokId` | förifyllda fält + `source` att skicka vidare i POST |
| GET | `/deviations/export.pdf?projectId` / `export.csv` | avviksrapport (bokmål för NO-företag, svenska annars) |

403 «Deviations are not included in your plan» = företaget saknar modulen `avvik` (ingår i Kontroll på jobben + Full) → dölj fliken. Modullistan: `GET /company/:id/modules` → `enabled` innehåller `avvik`.

## Push

`data = { type, screen: "Deviation", deviationId, entityId, projectId }`, preference `deviations`.

| type | till | när |
|---|---|---|
| `deviation_assigned` | ansvarig | tilldelad (skapande eller byte) |
| `deviation_reported` | företagsadmins + projektets ägare/ledare/projektadmins | nytt avvik (inte till den som rapporterade). **Av** tills app-releasen med «Avvik»-inställningen är ute: slå på med env `DEVIATION_NEW_REPORT_PUSH=true` |
| `deviation_due_soon` | ansvarig | 07:00 (Europe/Stockholm), frist i dag/i morgon, en gång per frist |
| `deviation_overdue` | ansvarig (saknas → projektledning) | 07:00 dagen efter fristen, en gång per frist |

Appen: `notifications.service.js` → `screen === "Deviation"` → `{ screen: "Deviation", params: { deviationId, projectId, fromPush: true } }`; registrera skärmen i `AppNavigator`; lägg `deviations` i `DEFAULT_NOTIFICATION_PREFERENCES` + `NOTIFICATION_PREFERENCE_ITEMS`; skicka `deviations` i PUT av inställningarna (backend: valfritt fält, gamla appar påverkas inte).
