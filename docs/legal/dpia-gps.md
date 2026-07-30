# DPIA — GPS-spårning av anställda — UTKAST

⚠️ UTKAST till konsekvensbedömning (art. 35 GDPR). Granskas av jurist/DPO. GPS-
positionering av anställda är typiskt hög risk och kräver DPIA + intresseavvägning.

## 1. Beskrivning av behandlingen
Mobilappen registrerar GPS-position i samband med **arbetspass (in-/utcheckning och
under passet)** för att styrka arbetad tid på rätt arbetsplats. iOS använder endast
"When in Use" (ingen bakgrundspositionering).

## 2. Nödvändighet och proportionalitet
- **Ändamål:** korrekt tidrapportering, underlag för lön/fakturering, arbetsplats-
  närvaro. Kan ändamålet nås mindre integritetskänsligt? (t.ex. manuell in-/utcheckning
  utan kontinuerlig spårning) — **motivera varför GPS behövs.**
- **Dataminimering:** samla endast position vid relevanta händelser, inte kontinuerlig
  spårning utanför arbetstid. Ingen bakgrundsspårning på iOS.
- **Lagring:** GPS-positioner raderas automatiskt efter **90 dagar** (default 90).

## 3. Rättslig grund
Berättigat intresse (art. 6.1 f) efter **intresseavvägning** — arbetsgivarens intresse
av korrekt tid/närvaro vägt mot den anställdes integritet. Samtycke är olämpligt i
anställningsförhållanden (ojämlik relation). Förankra i ev. kollektivavtal/facklig
samverkan.

## 4. Risker för de registrerade
| Risk | Sannolikhet | Allvar | Åtgärd |
|------|-------------|--------|--------|
| Upplevd övervakning | Medel | Medel | Tydlig information, endast vid pass, ingen bakgrund |
| Positionsdata avslöjar mer än arbetstid | Låg–Medel | Medel | Minimering, kort lagringstid, åtkomststyrning |
| Obehörig åtkomst | Låg | Hög | Kryptering, roll-/tenant-styrning, loggning |
| Ändamålsglidning | Låg | Hög | Dokumenterat ändamål, ej för prestationsmätning |

## 5. Åtgärder (mitigations)
- Transparent info till anställda (integritetspolicy + intern rutin).
- Endast "When in Use" på iOS; inga positioner utanför pass.
- **Automatisk radering av GPS efter 90 dagar** (implementeras som schemalagt jobb).
- Åtkomst endast för behöriga roller inom samma företag.
- Ingen användning för disciplinär prestationsövervakning.

## 6. Slutsats (preliminär bedömning — bekräftas av ansvarig/jurist)
Med de vidtagna åtgärderna — positionering endast vid arbetspass, ingen bakgrunds­spårning
på iOS, automatisk radering efter 90 dagar, roll-/tenant-baserad åtkomst och tydlig
information till anställda (se `gps-information-anstallda.md`) — bedöms **restrisken som
acceptabel (låg–medel)**. Behandlingen kan därmed genomföras utan förhandssamråd med IMY.
Bedömningen omprövas vid väsentlig förändring (t.ex. bakgrunds­spårning eller längre lagring).
Vid kvarstående hög risk krävs förhandssamråd med IMY (art. 36).
