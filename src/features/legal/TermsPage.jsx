'use client';

import LegalDocument from '@/src/features/legal/LegalDocument';

export default function TermsPage() {
  return (
    <LegalDocument title="Användarvillkor" updated="2026-07-30">
      <p className="legal-page__note">
        Standardvillkor — justera pris och villkor efter behov. Granskas av jurist innan publicering.
      </p>

      <h2>1. Tjänsten</h2>
      <p>
        ByggExp tillhandahålls av RealMar AB, org.nr 559474-9383 (”vi”). Villkoren gäller mellan
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
        Tjänsten tillhandahålls mot löpande abonnemangsavgift enligt gällande prislista. Avgiften
        faktureras i förskott per månad eller år. Abonnemanget löper tills vidare och kan sägas upp
        med en (1) månads uppsägningstid till utgången av innevarande betalperiod. Redan betalda
        avgifter återbetalas inte. Prisändringar meddelas minst 30 dagar i förväg.
      </p>

      <h2>4. Tillgänglighet och ansvar</h2>
      <p>
        Vi strävar efter hög tillgänglighet men lämnar inga garantier om oavbruten drift och kan
        genomföra planerat underhåll. Vårt sammanlagda ansvar är begränsat till de avgifter Kunden
        betalat för Tjänsten under de senaste tolv (12) månaderna. Vi ansvarar inte för indirekta
        skador såsom utebliven vinst eller dataförlust som Kunden själv kunnat undvika. Inget i
        villkoren begränsar ansvar som enligt tvingande lag inte får begränsas.
      </p>

      <h2>5. Immateriella rättigheter</h2>
      <p>
        Vi behåller alla rättigheter till plattformen. Kunden får en icke-exklusiv, icke
        överlåtbar rätt att använda Tjänsten under avtalstiden.
      </p>

      <h2>6. Kundens data</h2>
      <p>
        Kunden äger sina data. Vi behandlar personuppgifter enligt biträdesavtalet. Vid avslut
        kan data exporteras eller raderas, med undantag för vad lag kräver att vi sparar.
      </p>

      <h2>7. Force majeure</h2>
      <p>
        Ingen part ansvarar för dröjsmål eller fel som beror på omständigheter utanför partens
        rimliga kontroll (t.ex. avbrott hos underleverantör, elavbrott, myndighetsbeslut).
      </p>

      <h2>8. Ändringar</h2>
      <p>
        Vi kan uppdatera villkoren; väsentliga ändringar meddelas i förväg.
      </p>

      <h2>9. Tillämplig lag</h2>
      <p>
        Svensk lag gäller. Tvist avgörs av svensk domstol med Stockholm tingsrätt som första instans.
      </p>

      <h2>Kontakt</h2>
      <p>RealMar AB, Byggmästarvägen 18, c/o Hadjie Angela Hisoler Gepanaga, 168 32 Bromma. E-post: support@byggexp.se.</p>
    </LegalDocument>
  );
}
