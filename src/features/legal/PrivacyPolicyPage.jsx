'use client';

import LegalDocument from '@/src/features/legal/LegalDocument';

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Integritetspolicy" updated="2026-07-30">
      <p>
        Denna policy beskriver hur RealMar AB (”vi”), org.nr 559474-9383, behandlar
        personuppgifter i ByggExp-plattformen. För anställdas uppgifter agerar vi normalt
        personuppgiftsbiträde åt kundföretaget (arbetsgivaren), som är personuppgiftsansvarig.
      </p>

      <h2>Vilka uppgifter vi behandlar</h2>
      <ul>
        <li>Kontouppgifter: namn, e-post, telefon, roll, profilbild.</li>
        <li>Anställningsrelaterat: yrke, timpris, personnummer (för ROT/lön), certifikat.</li>
        <li>Tid &amp; närvaro: arbetspass, in-/utcheckning, timmar, personalliggare.</li>
        <li>Platsdata (GPS): din position läses tillfälligt vid start av arbetspass för att kontrollera närvaro på arbetsplatsen. Positionen sparas inte som koordinater hos oss – endast projektets adress sparas.</li>
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
        GPS-position används endast tillfälligt (When-In-Use) vid arbetspass för närvarokontroll
        och sparas inte som koordinater hos oss – endast projektets adress sparas. Personalliggare
        sparas i minst 2 år, bokföring/fakturor i 7 år. Övriga uppgifter så länge
        kund-/anställnings­relationen består, därefter gallring.
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
        uppgifter. Kontakta support@byggexp.se eller din arbetsgivare. Klagomål kan lämnas till
        Integritetsskyddsmyndigheten (IMY).
      </p>

      <h2>Kontakt</h2>
      <p>RealMar AB, Byggmästarvägen 18, c/o Alexander Gerhard, 168 32 Bromma. E-post: support@byggexp.se.</p>
    </LegalDocument>
  );
}
