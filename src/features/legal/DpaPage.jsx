'use client';

import LegalDocument from '@/src/features/legal/LegalDocument';

export default function DpaPage() {
  return (
    <LegalDocument title="Personuppgiftsbiträdesavtal (DPA)" updated="2026-07-30">
      <p className="legal-page__note">
        Detta biträdesavtal gäller mellan RealMar AB och det kundföretag som tecknar ett konto.
        Det utgör bilaga till abonnemanget/huvudavtalet. Granskas av jurist innan undertecknande.
      </p>

      <p>
        RealMar AB (org.nr 559474-9383), ”Biträdet”, behandlar personuppgifter för kundföretagets
        (”Ansvarig”) räkning enligt art. 28 GDPR.
      </p>

      <h2>1. Föremål och varaktighet</h2>
      <p>Biträdet behandlar uppgifter endast för att tillhandahålla plattformen, så länge
        huvudavtalet gäller. Vid upphörande raderas eller återlämnas uppgifter enligt punkt 8.</p>

      <h2>2. Behandlingens art och ändamål</h2>
      <p>Drift av bygg-/projekthanteringsplattform: konton, projekt, uppgifter, tid- och
        närvaroregistrering, GPS vid arbetspass, fakturering, lön och dokumenthantering.</p>

      <h2>3. Registrerade och uppgifter</h2>
      <p>Ansvarigs anställda, underentreprenörer, kontaktpersoner och kunder. Identitet/kontakt,
        anställningsdata, personnummer (ROT/lön), tid/närvaro, platsdata (GPS), ekonomi och
        projektdata.</p>

      <h2>4. Biträdets skyldigheter</h2>
      <p>Behandla endast enligt Ansvarigs dokumenterade instruktioner; säkerställa tystnadsplikt;
        vidta säkerhetsåtgärder enligt art. 32; bistå med registrerades rättigheter, säkerhet,
        incidentanmälan och DPIA; radera/återlämna vid avslut; möjliggöra granskning.</p>

      <h2>5. Underbiträden</h2>
      <p>Ansvarig ger generellt förhandsgodkännande till de underbiträden som anges på sidan
        <a href="/legal/underbitraden"> Underbiträden</a>. Biträdet informerar om planerade byten
        och Ansvarig kan invända. Underbiträden binds av motsvarande skyldigheter.</p>

      <h2>6. Tredjelandsöverföring</h2>
      <p>Sker endast med giltig mekanism (SCC / EU-US DPF). Se underbiträdeslistan.</p>

      <h2>7. Personuppgiftsincident</h2>
      <p>Biträdet underrättar Ansvarig utan onödigt dröjsmål med information för anmälan till IMY
        (inom 72 timmar).</p>

      <h2>8. Radering/återlämning</h2>
      <p>Vid avslut raderas eller exporteras uppgifter enligt Ansvarigs val, med undantag för vad
        lag kräver att spara (t.ex. bokföring 7 år).</p>

      <h2>Kontakt</h2>
      <p>RealMar AB, Byggmästarvägen 18, 168 32 Bromma. E-post: support@byggexp.se.</p>
    </LegalDocument>
  );
}
