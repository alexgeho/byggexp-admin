# Gallringsrutin (lagringstider) — RealMar AB

⚠️ Intern rutin. Underlag, ej juridisk rådgivning. Senast uppdaterad: 2026-07-30.

Personuppgifter sparas inte längre än nödvändigt. Följande tider gäller:

| Datatyp | Lagringstid | Grund | Hur gallras |
|---------|-------------|-------|-------------|
| Konto/anställd (namn, kontakt) | Under kund-/anställningsrelationen, därefter gallring | Avtal | GDPR-radering (anonymisering) i appen |
| GPS-positioner (locationSnapshot) | **90 dagar** | Dataminimering / DPIA | Automatiskt schemalagt jobb (GPS_RETENTION_DAYS) |
| Personalliggare / närvaro | Minst 2 år | Skatteförfarandelagen | Manuell/rutinmässig gallring efter 2 år |
| Fakturor, verifikationer, lön | 7 år | Bokföringslagen | Behålls hela perioden, gallras därefter |
| Aktivitetsloggar / audit | 12 månader | Berättigat intresse (säkerhet) | Rullande gallring |
| Push-tokens | Tills inaktiva/utloggning | Berättigat intresse | Raderas vid GDPR-radering och inaktivitet |
| Kvitto-/certifikatbilder | Under relationen / enligt bokföring | Avtal / rättslig förpliktelse | Gallras med kontot resp. bokföringstid |
| Marknadsförings-/kontaktförfrågningar | 12 månader | Berättigat intresse / samtycke | Gallras efter perioden |

## Rutin
- Automatisk gallring: GPS (90 dagar) via cron; loggar rullande.
- Manuell översyn: minst årligen — kontrollera att inget sparas i onödan.
- Vid kunds/anställnings avslut: erbjud export, kör sedan GDPR-radering (utom lagstadgad lagring).
- Se även: `register-art30.md`, `integritetspolicy.md`.
