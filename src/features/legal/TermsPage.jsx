'use client';

import LegalDocument from '@/src/features/legal/LegalDocument';

export default function TermsPage() {
  return (
    <LegalDocument title="Användarvillkor" updated="[DATUM]">
      <p className="legal-page__note">
        Utkast — kompletteras med [FÖRETAG]s uppgifter och pris-/abonnemangsvillkor och
        granskas av jurist innan publicering.
      </p>

      <h2>1. Tjänsten</h2>
      <p>
        ByggExp tillhandahålls av [FÖRETAG], org.nr [ORG.NR] (”vi”). Villkoren gäller mellan
        oss och det företag som tecknar ett konto (”Kunden”).
      </p>

      <h2>2. Konton och användning</h2>
      <p>
        Kunden ansvarar för sina användares konton och för att uppgifter som läggs in är
        korrekta och att behandling av anställdas personuppgifter (inkl. GPS) har laglig grund
        och kommuniceras till de anställda. Se integritetspolicyn och biträdesavtalet.
      </p>

      <h2>3. Abonnemang och betalning</h2>
      <p>
        Priser och betalningsvillkor framgår av beställningen/abonnemanget. [Ange bindningstid,
        uppsägning, prisändringar.]
      </p>

      <h2>4. Tillgänglighet och ansvar</h2>
      <p>
        Vi strävar efter hög tillgänglighet men lämnar inga garantier om oavbruten drift. Vårt
        ansvar är begränsat enligt [ange ansvarsbegränsning], i den mån lag tillåter.
      </p>

      <h2>5. Kundens data</h2>
      <p>
        Kunden äger sina data. Vi behandlar personuppgifter enligt biträdesavtalet. Vid avslut
        kan data exporteras eller raderas, med undantag för vad lag kräver att vi sparar.
      </p>

      <h2>6. Ändringar</h2>
      <p>
        Vi kan uppdatera villkoren; väsentliga ändringar meddelas i förväg.
      </p>

      <h2>7. Tillämplig lag</h2>
      <p>
        Svensk lag gäller. Tvist avgörs av svensk domstol med [ORT] tingsrätt som första instans.
      </p>

      <h2>Kontakt</h2>
      <p>[FÖRETAG], [ADRESS]. E-post: [E-POST].</p>
    </LegalDocument>
  );
}
