# Löner-flöde: benchmark + kritik (2026-10-24)

## Mönster hos stora (Quinyx, Visma/Spiris Tid→Lön, Planday, Gusto, Deputy, Procore, Fortnox + StarBrix/Mowin)
Period först → lista alla personer med attest-status → klick person (dagar × lönearter + summor) → EN export för hela perioden (bocka i/ur personer) → markera som överförd / lås perioden.
- Quinyx: Time → Transfer to payroll; godkända förbockade; Preliminär (låser inget) vs Definitiv (låser).
- Visma: ej attesterad tid ger bara preliminärt löneunderlag; välj anställda till en fil.
- Planday: filter period/avdelning/anställd/godkänd; "Lock date range for payroll".
- Gusto: godkänd tidrapport låses. Deputy: godkänn alla → exportera per lönekalender.
- Procore: export + "markera som Completed". StarBrix→Fortnox: visar bara ej skickade timmar.
- Fortnox import: anställningsnr måste matcha; lönearter med "tillåt kalenderregistrering"; avvikelseperiod styr lönekörning.

## Kritik av nuvarande admin
- Ekonomi → Löner visar "lönekörningar" (Hours-gridens "Skicka till lön", platt timmar×timlön) — annan motor än Löneunderlag (wage-basis) → två sanningar.
- Löneunderlag gömd bakom sekundärknapp; per-dag-vy saknas (items har date + projectId men grupperas per kod).
- Lönerader med belopp 0 tappas tyst (wage-basis.ts:288).

## Backend idag (utan ändring)
- GET /payroll-basis + /export: bara from/to/format, alla anställda, max 93 dagar, roller SuperAdmin/CompanyAdmin.
- Per person/per dag/projektfilter går att göra i frontend från samma anrop (items har date, projectId). /shifts/list har workerId/projectId.
- Kräver backend: export för valda personer (userIds), "exporterad"-markering + periodlås, attest-status per dag i items, ev. projectAdmin-åtkomst.

## Rekommenderad struktur
1. Ekonomi → Löner = personlista direkt. Överst: månad (default förra), projektfilter (visning), en blå "Exportera till Fortnox" för alla.
2. Kolumner: Namn, Normal, Övertid, OB, Restid, Bil km, Traktamente, Frånvaro, Belopp, Status.
3. Klick → personsida (route): dag × typ + summarad + lönearter; länk till Passlogg per dag.
4. Problem (saknat anst.nr/timlön/löneart) som en banner med länk.
5. Lönesystem och koder → ⋮ / inställningar. Lönekörningar bort ur menyn.
