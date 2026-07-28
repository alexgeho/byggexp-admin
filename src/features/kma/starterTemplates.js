// Ready-made egenkontroll templates so a company doesn't start from an empty
// Mallar list. Added on demand via the "Standardmallar" button.
export const STARTER_TEMPLATES = [
  {
    name: 'Egenkontroll El',
    category: 'quality',
    description: 'Kontroll av elinstallation enligt gällande normer.',
    items: [
      { text: 'Jordfelsbrytare testad och fungerar', reference: '' },
      { text: 'Märkning av gruppcentral komplett', reference: '' },
      { text: 'Isolationsmätning utförd', reference: 'SS 436 40 00' },
      { text: 'Skyddsledare anslutna', reference: '' },
      { text: 'Dosor och uttag täta och fastsatta', reference: '' },
    ],
  },
  {
    name: 'Egenkontroll VVS',
    category: 'quality',
    description: 'Kontroll av VVS-installation.',
    items: [
      { text: 'Täthetsprovning av rör utförd', reference: '' },
      { text: 'Avstängningsventiler monterade och märkta', reference: '' },
      { text: 'Isolering av rör komplett', reference: '' },
      { text: 'Fall på avloppsledningar kontrollerat', reference: '' },
      { text: 'Vattentryck kontrollerat', reference: '' },
    ],
  },
  {
    name: 'Egenkontroll Bygg / Stomme',
    category: 'quality',
    description: 'Kontroll av byggkonstruktion.',
    items: [
      { text: 'Måttkontroll mot ritning', reference: '' },
      { text: 'Infästningar och förankringar kontrollerade', reference: '' },
      { text: 'Fuktkontroll utförd', reference: '' },
      { text: 'Brandtätning genomförd', reference: 'BBR' },
      { text: 'Avvikelser dokumenterade', reference: '' },
    ],
  },
  {
    name: 'Skyddsrond (Arbetsmiljö)',
    category: 'work_environment',
    description: 'Kontroll av arbetsmiljön på arbetsplatsen.',
    items: [
      { text: 'Fallskydd på plats där det behövs', reference: '' },
      { text: 'Ordning och reda på arbetsplatsen', reference: '' },
      { text: 'Personlig skyddsutrustning används', reference: '' },
      { text: 'Ställningar besiktigade och märkta', reference: '' },
      { text: 'Första hjälpen och brandsläckare tillgängliga', reference: '' },
    ],
  },
];
