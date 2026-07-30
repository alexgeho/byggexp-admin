'use client';

import LegalDocument from '@/src/features/legal/LegalDocument';

const ROWS = [
  ['MongoDB Atlas', 'Databas / hosting', 'EU – AWS Stockholm', 'Inom EES'],
  ['VPS-leverantör', 'App-drift', 'EU', 'Inom EES'],
  ['Anthropic', 'AI – kvitto-/certifikatskanning', 'USA', 'DPA + SCC'],
  ['DeepL', 'Maskinöversättning', 'Tyskland (EU)', 'Inom EES'],
  ['Stripe', 'Betalning / abonnemang', 'EU + USA', 'DPA + SCC + EU-US DPF'],
  ['Expo', 'Push-notiser', 'USA', 'DPA / SCC'],
  ['Apple APNs / Google FCM', 'Leverans av push', 'USA', 'SCC / EU-US DPF'],
];

export default function SubprocessorsPage() {
  return (
    <LegalDocument title="Underbiträden" updated="2026-07-30">
      <p>
        RealMar AB (org.nr 559474-9383) anlitar följande underbiträden för att tillhandahålla
        ByggExp. Överföring till tredje land sker endast med giltig mekanism (EU:s
        standardavtalsklausuler och/eller EU-US Data Privacy Framework).
      </p>
      <table>
        <thead>
          <tr><th>Underbiträde</th><th>Tjänst</th><th>Plats</th><th>Överföringsmekanism</th></tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        Vissa tjänster (t.ex. betalning och AI) aktiveras först vid behov. Vi uppdaterar listan
        när underbiträden tillkommer eller tas bort och informerar personuppgiftsansvariga kunder
        enligt personuppgiftsbiträdesavtalet.
      </p>
      <h2>Kontakt</h2>
      <p>RealMar AB, Byggmästarvägen 18, 168 32 Bromma. E-post: app@byggexp.se.</p>
    </LegalDocument>
  );
}
