# Register över behandlingar (Art. 30 GDPR) — RealMar AB

⚠️ Internt dokument (visas för IMY på begäran, publiceras ej). Underlag, ej juridisk
rådgivning — granskas/uppdateras löpande. Senast uppdaterad: 2026-07-30.

**Personuppgiftsansvarig:** RealMar AB, org.nr 559474-9383, Byggmästarvägen 18,
c/o Alexander Gerhard, 168 32 Bromma. Kontakt: support@byggexp.se.
För kundföretagens anställda agerar RealMar AB **personuppgiftsbiträde** (se DPA).

## Behandlingar

| # | Ändamål | Kategorier registrerade | Kategorier av uppgifter | Rättslig grund | Mottagare / underbiträden | Tredjeland | Lagringstid |
|---|---------|--------------------------|--------------------------|----------------|----------------------------|-----------|-------------|
| 1 | Konto & inloggning | Anställda, admins | Namn, e-post, telefon, roll, lösenord (hash) | Avtal | MongoDB Atlas (EU), VPS (EU) | Nej | Under kund-/anställningsrelation, därefter gallring |
| 2 | Projekt- & uppgiftshantering | Anställda | Uppgifter, dagbok, foton, dokument | Avtal / berättigat intresse | Atlas (EU) | Nej | Under relationen |
| 3 | Tid & närvaro, personalliggare | Anställda, UE | In-/utcheckning, timmar, personnummer | Rättslig förpliktelse (SFL) + berättigat intresse | Atlas (EU) | Nej | Personalliggare ≥ 2 år |
| 4 | GPS vid arbetspass | Anställda | Position vid pass (locationSnapshot) | Berättigat intresse (intresseavvägning, DPIA) | Atlas (EU) | Nej | **90 dagar** (auto-radering) |
| 5 | Fakturering, ROT, offert | Kunder, anställda | Fakturor, personnummer (ROT), belopp | Rättslig förpliktelse (BFL, ML) | Atlas (EU) | Nej | Bokföring 7 år |
| 6 | Lön & lönespecar | Anställda | Lön, skattetabell, personnummer | Rättslig förpliktelse | Atlas (EU); Skatteverket (tabelldata) | Nej | Bokföring 7 år |
| 7 | Kvitto-/certifikatskanning (AI) | Anställda | Kvitto-/certifikatbilder + extraherad text | Berättigat intresse | Anthropic (US) | Ja – SCC | Tills behandlad; bild lagras i Atlas (EU) |
| 8 | Chatt & översättning | Anställda | Meddelandetext | Avtal / berättigat intresse | DeepL (DE) | Nej | Under relationen |
| 9 | Push-notiser | Anställda | Push-token, enhets-/plattformsinfo | Berättigat intresse | Expo, Apple APNs, Google FCM (US) | Ja – SCC/DPF | Inaktiva tokens raderas |
| 10 | Betalning / abonnemang | Kontoinnehavare | Betaluppgifter, faktureringsdata | Avtal | Stripe (EU/US) | Ja – SCC/DPF | Enligt Stripe / bokföring |
| 11 | Säkerhet, loggar, audit | Alla användare | Aktivitetsloggar, teknisk data | Berättigat intresse | Atlas (EU) | Nej | 12 månader |

## Tekniska och organisatoriska säkerhetsåtgärder (art. 32)
Kryptering i transit; roll- och företagsbaserad åtkomststyrning (tenant-isolering);
lösenords-hashning; minsta behörighet; loggning/audit; automatisk radering av GPS;
GDPR-export och -radering i appen; backup (aktiveras vid uppgradering från gratis-tier).

## Att hålla uppdaterat
- Ny behandling/underbiträde → lägg till en rad.
- Ändrad lagringstid eller rättslig grund → uppdatera.
- Se även: `integritetspolicy.md`, `personuppgiftsbitradesavtal.md`, `underbitraden.md`, `dpia-gps.md`.
