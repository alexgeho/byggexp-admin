# Underbiträden (sub-processors) — RealMar AB

⚠️ Underlag, ej juridisk rådgivning. DPF-certifieringar kan ändras — **verifiera alltid
mot den officiella listan** innan du förlitar dig på den: https://www.dataprivacyframework.gov/list

Personuppgiftsansvarig: RealMar AB (org.nr 559474-9383). Nedan är de underbiträden
plattformen använder och den överföringsmekanism som ska vara på plats för var och en.

## Översikt

| Underbiträde | Tjänst | Plats | Mekanism (EU-överföring) | Status |
|--------------|--------|-------|--------------------------|--------|
| MongoDB Atlas | Databas / hosting | **EU – AWS Stockholm (eu-north-1)** | Data i EES; MongoDB Inc (US) via DPA + SCC för ev. support-access | ✅ region bekräftad |
| VPS ([leverantör]) | App-drift (backend/admin) | [BEKRÄFTA – välj EU] | Inom EES om EU-region | ☐ fyll i leverantör + region |
| Anthropic | AI – kvitto-/certifikatskanning | USA | DPA + SCC (+ ev. EU-US DPF) | ☐ teckna DPA |
| DeepL | Maskinöversättning av chatt | Tyskland (EU) | Inom EES | ✅ inom EU |
| Stripe | Betalning / abonnemang | EU + USA | DPA + SCC + EU-US DPF | ☐ acceptera DPA |
| Expo | Push-notiser (mobil) | USA | DPA/SCC – **svagast, se nedan** | ☐ utred |
| Apple APNs / Google FCM | Leverans av push | USA | Via Expo; Apple & Google har DPA/SCC/DPF | ☐ verifiera i DPF-listan |
| [SMTP-leverantör] | Utgående e-post | [BEKRÄFTA] | [BEKRÄFTA] | ☐ fyll i |

## Vad du behöver göra per US-underbiträde

### Anthropic (AI)
1. Teckna/acceptera **Anthropics Data Processing Addendum** (innehåller EU-SCC) via deras
   trust/legal-sidor (trust.anthropic.com → DPA).
2. Säkerställ att **API-data inte används för modellträning** (gäller kommersiella API-villkor
   som standard – bekräfta i avtalet).
3. Notera i registret: ändamål = OCR av kvitton/certifikat; endast bild + extraherad text.
4. Verifiera om Anthropic finns i DPF-listan; annars räcker SCC.

### Stripe (betalning)
1. Stripes **DPA** gäller automatiskt via deras villkor – ladda ned och arkivera
   (stripe.com/legal/dpa).
2. Kontrollera att **Stripe** står som aktiv i EU-US DPF-listan (self-certifierat) – annars SCC.
3. Aktiveras först när Stripe-nycklar konfigureras (abonnemang är annars vilande).

### Expo (push)
- Expo är en mindre leverantör; **DPA/SCC-läget är svagast** av dessa. Alternativ:
  1. Begär/teckna DPA med Expo (650 Industries) om de erbjuder det, eller
  2. **Skicka push direkt via APNs/FCM** utan Expos moln (starkast integritet), eller
  3. Skicka inga personuppgifter i push-payloaden (endast neutrala notiser) – minimering.
- Push-token är personuppgift; radera inaktiva tokens (görs redan vid GDPR-radering).

### Apple APNs / Google FCM
- Levererar själva push-meddelandet. Både Apple och Google har DPA + SCC och är normalt
  DPF-listade – **verifiera** och arkivera hänvisning.

## Att göra (checklista)
- [ ] Fyll i VPS-leverantör + bekräfta EU-region.
- [ ] Fyll i SMTP-leverantör + region + mekanism.
- [ ] Teckna/arkivera DPA: Anthropic, Stripe, (Expo).
- [ ] Verifiera DPF-status i officiella listan för Stripe, Apple, Google, ev. Anthropic.
- [ ] Bekräfta att AI-tjänster inte tränar på kunddata.
- [ ] Uppdatera denna lista när tjänster läggs till/tas bort och informera kunder (personuppgiftsansvariga) enligt biträdesavtalet.

> Endast **aktivt använda** tjänster tas med i den version som visas för kunder. Vilande
> integrationer (Stripe/Anthropic tills nycklar sätts) kan utelämnas tills de aktiveras.
