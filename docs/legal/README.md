# Legal / GDPR — UTKAST (drafts)

⚠️ **Dessa dokument är UTKAST framtagna som underlag. De är INTE juridisk
rådgivning och måste granskas av en jurist / ert dataskyddsombud innan de
publiceras eller undertecknas.** Fyll i alla `[PLACEHOLDER]` och bekräfta varje
uppgift (särskilt var data lagras rent fysiskt och vilka underbiträden som används).

| Fil | Vad | Status |
|-----|-----|--------|
| `integritetspolicy.md` | Extern integritetspolicy (privacy policy) | UTKAST |
| `personuppgiftsbitradesavtal.md` | DPA att teckna med varje kundföretag | UTKAST |
| `underbitraden.md` | Lista över underbiträden + tredjelandsöverföringar | UTKAST — verifiera regioner |
| `dpia-gps.md` | Konsekvensbedömning (DPIA) för GPS-spårning | UTKAST |

## Roller
- **Personuppgiftsansvarig (controller):** kundföretaget (byggföretaget) för sina anställdas data.
- **Personuppgiftsbiträde (processor):** [FÖRETAG] (ByggExp) som driver plattformen.
- För [FÖRETAG]s *egna* uppgifter (t.ex. kontoinnehavare, fakturering av kunden) är [FÖRETAG] själv ansvarig.

## Att bekräfta innan publicering
- [ ] Fysisk lagringsregion för databasen (MongoDB Atlas) — **måste vara inom EU/EES** eller ha giltig överföringsmekanism.
- [ ] Aktuell lista över underbiträden och deras regioner (se `underbitraden.md`).
- [ ] Lagringstider per datatyp (särskilt GPS-positioner).
- [ ] Kontaktväg för registrerades rättigheter (e-post/DPO).
