'use client';

import LegalDocument from '@/src/features/legal/LegalDocument';

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Integritetspolicy" updated="[DATUM]">
      <p className="legal-page__note">
        Utkast — kompletteras med [FÖRETAG]s uppgifter (org.nr, adress, kontakt) och
        granskas av jurist innan publicering.
      </p>

      <p>
        Denna policy beskriver hur [FÖRETAG] (”vi”), org.nr [ORG.NR], behandlar
        personuppgifter i ByggExp-plattformen. För anställdas uppgifter agerar vi normalt
        personuppgiftsbiträde åt kundföretaget (arbetsgivaren), som är personuppgiftsansvarig.
      </p>

      <h2>Vilka uppgifter vi behandlar</h2>
      <ul>
        <li>Kontouppgifter: namn, e-post, telefon, roll, profilbild.</li>
        <li>Anställningsrelaterat: yrke, timpris, personnummer (för ROT/lön), certifikat.</li>
        <li>Tid &amp; närvaro: arbetspass, in-/utcheckning, timmar, personalliggare.</li>
        <li>Platsdata (GPS): position vid arbetspass för att styrka arbetad tid.</li>
        <li>Projekt: uppgifter, dagbok, foton, dokument. Ekonomi: fakturor, utlägg, lön.</li>
      </ul>

      <h2>Ändamål och rättslig grund</h2>
      <table>
        <thead><tr><th>Ändamål</th><th>Rättslig grund</th></tr></thead>
        <tbody>
          <tr><td>Tillhandahålla tjänsten</td><td>Avtal</td></tr>
          <tr><td>Tid/närvaro, personalliggare</td><td>Rättslig förpliktelse + berättigat intresse</td></tr>
          <tr><td>GPS vid arbetspass</td><td>Berättigat intresse (efter intresseavvägning)</td></tr>
          <tr><td>Fakturering, ROT, lön, bokföring</td><td>Rättslig förpliktelse</td></tr>
        </tbody>
      </table>

      <h2>Lagringstider</h2>
      <p>
        GPS-positioner raderas automatiskt efter [90] dagar. Personalliggare sparas i minst
        2 år, bokföring/fakturor i 7 år. Övriga uppgifter så länge kund-/anställnings­relationen
        består, därefter gallring.
      </p>

      <h2>Mottagare och överföringar</h2>
      <p>
        Vi anlitar underbiträden för drift, betalning, e-post och AI-funktioner. Överföring
        till tredje land sker endast med giltig mekanism (EU:s standardavtalsklausuler / EU-US
        Data Privacy Framework).
      </p>

      <h2>Dina rättigheter</h2>
      <p>
        Du har rätt till tillgång, rättelse, radering, begränsning, dataportabilitet och att
        invända. I plattformen kan personuppgiftsansvarig exportera och radera en användares
        uppgifter. Kontakta [E-POST] eller din arbetsgivare. Klagomål kan lämnas till
        Integritetsskyddsmyndigheten (IMY).
      </p>

      <h2>Kontakt</h2>
      <p>[FÖRETAG], [ADRESS]. E-post: [E-POST].</p>
    </LegalDocument>
  );
}
