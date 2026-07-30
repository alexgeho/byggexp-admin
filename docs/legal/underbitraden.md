# Underbiträden (sub-processors) — UTKAST

⚠️ UTKAST — **verifiera varje rad**, särskilt lagringsregion och överföringsmekanism.
Uppdatera denna lista när tjänster läggs till/tas bort och informera Ansvarig.

| Underbiträde | Tjänst | Plats / region | Överföringsmekanism |
|--------------|--------|----------------|----------------------|
| MongoDB Atlas | Databas / hosting | **[BEKRÄFTA region — ska vara EU/EES]** | SCC om utanför EES |
| [VPS-leverantör] | Applikationsdrift (backend/admin) | [BEKRÄFTA] | — om inom EES |
| Anthropic | AI (kvitto-/faktura-scanning, översättning) | USA | SCC / EU-US DPF |
| DeepL | Maskinöversättning av chatt | Tyskland (EU) | Inom EES |
| Stripe | Betalning/abonnemang | EU + USA | SCC / EU-US DPF |
| Expo (push) | Push-notiser till mobilappen | USA | SCC / EU-US DPF |
| [SMTP-leverantör] | Utgående e-post | [BEKRÄFTA] | [BEKRÄFTA] |

## Att göra
- [ ] Bekräfta MongoDB Atlas-region (kritiskt — annars tredjelandsöverföring av all data).
- [ ] Teckna/verifiera DPA med varje underbiträde ovan.
- [ ] Fyll i VPS- och SMTP-leverantör.
- [ ] Kontrollera att AI-tjänster inte tränar på kunddata (opt-out/enterprise-villkor).
- [ ] Dokumentera överföringsmekanism (SCC-version / DPF-certifiering) per US-tjänst.

> Notera: vissa underbiträden (t.ex. AI, betalning) aktiveras först när respektive
> API-nyckel/konto konfigureras. Ta bara med aktivt använda tjänster i den publicerade
> listan.
