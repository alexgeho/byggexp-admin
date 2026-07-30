# Legal / GDPR — UTKAST (drafts)

⚠️ **Dessa dokument är UTKAST framtagna som underlag. De är INTE juridisk
rådgivning och måste granskas av en jurist / ert dataskyddsombud innan de
publiceras eller undertecknas.** Fyll i alla `[PLACEHOLDER]` och bekräfta varje
uppgift (särskilt var data lagras rent fysiskt och vilka underbiträden som används).

| Fil | Vad | Status |
|-----|-----|--------|
| `integritetspolicy.md` | Extern integritetspolicy (privacy policy) — publiceras på `/legal/integritetspolicy` | Ifylld · juristgranskning kvar |
| `personuppgiftsbitradesavtal.md` | DPA att teckna med varje kundföretag — sida `/legal/dpa` | Ifylld · juristgranskning kvar |
| `underbitraden.md` | Underbiträden + tredjelandsöverföringar — sida `/legal/underbitraden` | Ifylld · komplettera VPS/SMTP |
| `dpia-gps.md` | Konsekvensbedömning (DPIA) för GPS-spårning | Ifylld · slutsats kvar |
| `register-art30.md` | Register över behandlingar (Art. 30) — internt | Ifylld |
| `incidentrutin.md` | Rutin vid personuppgiftsincident (72 h) — internt | Klar |
| `gallringsrutin.md` | Lagringstider / gallring — internt | Klar |
| `gps-information-anstallda.md` | Info till anställda om GPS — mall | Klar |

## Roller
- **Personuppgiftsansvarig (controller):** kundföretaget (byggföretaget) för sina anställdas data.
- **Personuppgiftsbiträde (processor):** RealMar AB (ByggExp) som driver plattformen.
- För RealMar ABs *egna* uppgifter (t.ex. kontoinnehavare, fakturering av kunden) är RealMar AB själv ansvarig.

## Att bekräfta innan publicering
- [ ] Fysisk lagringsregion för databasen (MongoDB Atlas) — **måste vara inom EU/EES** eller ha giltig överföringsmekanism.
- [ ] Aktuell lista över underbiträden och deras regioner (se `underbitraden.md`).
- [ ] Lagringstider per datatyp (särskilt GPS-positioner).
- [ ] Kontaktväg för registrerades rättigheter (e-post/DPO).
