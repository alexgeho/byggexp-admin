'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Collapse, Segmented } from 'antd';
import {
  ApartmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MobileOutlined,
  PlayCircleOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import './HelpPage.scss';

// Training videos for the admin web app. Drop a YouTube/Loom embed URL into
// `url` and the card renders the player; until then it shows a "coming soon"
// placeholder so the section is ready the moment content exists.
const TRAINING_VIDEOS = [
  { title: { en: 'Quick start: set up your company', sv: 'Snabbstart: ställ in ditt företag', nb: 'Hurtigstart: sett opp bedriften din' }, url: null },
  { title: { en: 'Projects, shifts & the hours grid', sv: 'Projekt, pass & timrutnätet', nb: 'Prosjekter, økter og timerutenettet' }, url: null },
  { title: { en: 'From offer to invoice (with ROT)', sv: 'Från offert till faktura (med ROT)', nb: 'Fra tilbud til faktura (med ROT)' }, url: null },
];

// In-app help / getting-started guide. Long-form content is kept trilingual
// inline ({ en, sv, nb }) rather than in the messages.js UI dictionary — docs
// read better authored as whole paragraphs than as fragmented keys. Two
// audiences: company admins (this web app) and workers (the mobile app),
// toggled at top.

const pick = (lang, pair) => pair[lang] ?? pair.en;

// Each topic: an icon, a title, and an ordered list of short steps. `to` links
// straight to the screen that does the thing (admin topics only).
const ADMIN_TOPICS = [
  {
    icon: <ApartmentOutlined />,
    to: '/company/profile',
    title: { en: 'Set up your company', sv: 'Ställ in ditt företag', nb: 'Sett opp bedriften din' },
    steps: [
      { en: 'Open Profile and fill in your company name, org. number and address — these appear on every offer and invoice.', sv: 'Öppna Profil och fyll i företagsnamn, org.nummer och adress — de visas på varje offert och faktura.', nb: 'Åpne Profil og fyll ut bedriftsnavn, org.nummer og adresse — disse vises på hvert tilbud og hver faktura.' },
      { en: 'Add your logo and set your VAT and ROT defaults so documents are correct from the start.', sv: 'Lägg till din logotyp och ange moms- och ROT-standarder så att dokumenten blir rätt från början.', nb: 'Legg til logoen din og angi mva- og ROT-standarder så dokumentene blir riktige fra start.' },
    ],
  },
  {
    icon: <TeamOutlined />,
    to: '/company/users',
    title: { en: 'Add your team & set roles', sv: 'Lägg till ditt team & roller', nb: 'Legg til teamet ditt og roller' },
    steps: [
      { en: 'Under Users, invite each employee by name and email. They use that email to sign in to the mobile app.', sv: 'Under Användare bjuder du in varje anställd med namn och e-post. De loggar in i mobilappen med den e-posten.', nb: 'Under Brukere inviterer du hver ansatt med navn og e-post. De bruker den e-posten til å logge inn i mobilappen.' },
      { en: 'Pick a role: Worker (logs shifts and photos), Project admin (runs a project), or Company admin (full access).', sv: 'Välj en roll: Hantverkare (registrerar pass och foton), Projektadmin (driver ett projekt) eller Företagsadmin (full åtkomst).', nb: 'Velg en rolle: Ansatt (registrerer økter og bilder), Prosjektadmin (driver et prosjekt) eller Bedriftsadmin (full tilgang).' },
      { en: 'You can promote someone to Company admin later from their profile.', sv: 'Du kan uppgradera någon till Företagsadmin senare från deras profil.', nb: 'Du kan senere forfremme noen til Bedriftsadmin fra profilen deres.' },
    ],
  },
  {
    icon: <ApartmentOutlined />,
    to: '/company/projects',
    title: { en: 'Create and run projects', sv: 'Skapa och driv projekt', nb: 'Opprett og driv prosjekter' },
    steps: [
      { en: 'Create a project, then assign the workers who belong to it.', sv: 'Skapa ett projekt och tilldela sedan de hantverkare som hör till det.', nb: 'Opprett et prosjekt, og tildel deretter de ansatte som hører til det.' },
      { en: 'Set the site location and work hours — shifts are tracked against this and hours are compared to plan.', sv: 'Ange arbetsplatsens läge och arbetstider — pass registreras mot detta och timmar jämförs med planen.', nb: 'Angi arbeidsplassens plassering og arbeidstider — økter registreres mot dette og timer sammenlignes med planen.' },
      { en: 'Everything ties to the project: shifts, tasks, photos, blueprints, diary (Dagbok) and costs.', sv: 'Allt kopplas till projektet: pass, uppgifter, foton, ritningar, dagbok och kostnader.', nb: 'Alt knyttes til prosjektet: økter, oppgaver, bilder, tegninger, dagbok og kostnader.' },
    ],
  },
  {
    icon: <ClockCircleOutlined />,
    to: '/company/shifts',
    title: { en: 'Time & shifts', sv: 'Tid & arbetspass', nb: 'Tid og arbeidsøkter' },
    steps: [
      { en: 'Workers start and stop shifts in the mobile app; location confirms they are on site.', sv: 'Hantverkare startar och avslutar pass i mobilappen; platsen bekräftar att de är på arbetsplatsen.', nb: 'Ansatte starter og avslutter økter i mobilappen; plasseringen bekrefter at de er på arbeidsplassen.' },
      { en: 'Open Shifts to see live who is working, and the Hours grid to compare planned vs. actual hours.', sv: 'Öppna Arbetspass för att se vem som jobbar just nu, och timrutnätet för att jämföra planerade mot faktiska timmar.', nb: 'Åpne Arbeidsøkter for å se hvem som jobber i sanntid, og timerutenettet for å sammenligne planlagte mot faktiske timer.' },
      { en: 'Adjust or correct hours in the grid before you export them to payroll.', sv: 'Justera eller korrigera timmar i rutnätet innan du exporterar dem till lön.', nb: 'Juster eller korriger timer i rutenettet før du eksporterer dem til lønn.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    to: '/company/my-work',
    title: { en: 'Tasks & reminders', sv: 'Uppgifter & påminnelser', nb: 'Oppgaver og påminnelser' },
    steps: [
      { en: 'Assign a task to a project or a person, with a due date and priority.', sv: 'Tilldela en uppgift till ett projekt eller en person, med förfallodatum och prioritet.', nb: 'Tildel en oppgave til et prosjekt eller en person, med frist og prioritet.' },
      { en: 'Set a reminder so the assignee is nudged — repeat until it is confirmed done.', sv: 'Ställ in en påminnelse så att mottagaren puffas — upprepa tills den bekräftas klar.', nb: 'Sett en påminnelse så den tildelte purres — gjenta til den bekreftes ferdig.' },
      { en: 'Use Repeat for recurring jobs (weekly site cleaning, monthly checks). My work is your daily to-do surface.', sv: 'Använd Upprepa för återkommande jobb (veckostädning, månadskontroller). Mitt arbete är din dagliga att-göra-vy.', nb: 'Bruk Gjenta for tilbakevendende jobber (ukentlig rydding, månedlige kontroller). Mitt arbeid er din daglige gjøremålsoversikt.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    to: '/company/invoicing/offers',
    title: { en: 'Offers & invoices', sv: 'Offerter & fakturor', nb: 'Tilbud og fakturaer' },
    steps: [
      { en: 'Add a client, then create an offer — the AI can draft priced rows from a short description.', sv: 'Lägg till en kund och skapa sedan en offert — AI:n kan skapa prissatta rader från en kort beskrivning.', nb: 'Legg til en kunde, og opprett deretter et tilbud — AI-en kan lage prisede rader fra en kort beskrivelse.' },
      { en: 'Convert an accepted offer into an invoice. Apply ROT deduction for private customers.', sv: 'Omvandla en accepterad offert till en faktura. Tillämpa ROT-avdrag för privatkunder.', nb: 'Gjør et akseptert tilbud om til en faktura. Bruk ROT-avdrag for privatkunder.' },
      { en: 'Send by email as a PDF. Corrections go out as a credit note — sent invoices stay unchanged.', sv: 'Skicka som PDF via e-post. Rättelser görs som kreditfaktura — skickade fakturor ändras inte.', nb: 'Send som PDF på e-post. Rettelser sendes som kreditnota — sendte fakturaer forblir uendret.' },
    ],
  },
  {
    icon: <ShopOutlined />,
    to: '/company/invoicing/supplier-invoices',
    title: { en: 'Purchases, expenses & payroll', sv: 'Inköp, utlägg & lön', nb: 'Innkjøp, utlegg og lønn' },
    steps: [
      { en: 'Register purchase invoices and photograph expense receipts — scanning reads the amounts for you.', sv: 'Registrera inköpsfakturor och fotografera kvitton — skanningen läser av beloppen åt dig.', nb: 'Registrer innkjøpsfakturaer og fotografer kvitteringer — skanningen leser av beløpene for deg.' },
      { en: 'Approve what your team submits from the My work inbox.', sv: 'Godkänn det ditt team skickar in från Mitt arbete-inkorgen.', nb: 'Godkjenn det teamet ditt sender inn fra Mitt arbeid-innboksen.' },
      { en: 'Run payroll from logged hours: gross → tax → net, with payslips per employee.', sv: 'Kör lön från registrerade timmar: brutto → skatt → netto, med lönespecifikationer per anställd.', nb: 'Kjør lønn fra registrerte timer: brutto → skatt → netto, med lønnsslipper per ansatt.' },
    ],
  },
];

const WORKER_TOPICS = [
  {
    icon: <MobileOutlined />,
    title: { en: 'Sign in to the app', sv: 'Logga in i appen', nb: 'Logg inn i appen' },
    steps: [
      { en: 'Download the ByggExp app and sign in with the email your company invited you with.', sv: 'Ladda ner ByggExp-appen och logga in med den e-post ditt företag bjöd in dig med.', nb: 'Last ned ByggExp-appen og logg inn med e-posten bedriften din inviterte deg med.' },
      { en: 'If you cannot sign in, ask your admin to check your account is added and approved.', sv: 'Om du inte kan logga in, be din admin kontrollera att ditt konto är tillagt och godkänt.', nb: 'Hvis du ikke får logget inn, be administratoren din sjekke at kontoen din er lagt til og godkjent.' },
    ],
  },
  {
    icon: <ClockCircleOutlined />,
    title: { en: 'Start & end a shift', sv: 'Starta & avsluta ett pass', nb: 'Start og avslutt en økt' },
    steps: [
      { en: 'On site, open the project and start your shift. Allow location so it registers you as present.', sv: 'På plats, öppna projektet och starta ditt pass. Tillåt plats så registreras du som närvarande.', nb: 'På plass, åpne prosjektet og start økten din. Tillat posisjon så du registreres som til stede.' },
      { en: 'End the shift when you leave. Your hours are sent to the office automatically.', sv: 'Avsluta passet när du går. Dina timmar skickas till kontoret automatiskt.', nb: 'Avslutt økten når du drar. Timene dine sendes til kontoret automatisk.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    title: { en: 'Upload photos', sv: 'Ladda upp foton', nb: 'Last opp bilder' },
    steps: [
      { en: 'During a shift, take or upload photos of the work — they attach to the project for the office to see.', sv: 'Under ett pass, ta eller ladda upp foton av arbetet — de kopplas till projektet så kontoret ser dem.', nb: 'Under en økt kan du ta eller laste opp bilder av arbeidet — de knyttes til prosjektet så kontoret ser dem.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    title: { en: 'Your tasks', sv: 'Dina uppgifter', nb: 'Dine oppgaver' },
    steps: [
      { en: 'See the tasks assigned to you, and tick them off when done.', sv: 'Se uppgifterna som tilldelats dig och bocka av dem när de är klara.', nb: 'Se oppgavene som er tildelt deg, og kryss dem av når de er ferdige.' },
      { en: 'If you get a reminder, confirm the task is finished so it stops nudging you.', sv: 'Om du får en påminnelse, bekräfta att uppgiften är klar så slutar den puffa dig.', nb: 'Hvis du får en påminnelse, bekreft at oppgaven er ferdig så den slutter å purre deg.' },
    ],
  },
  {
    icon: <TeamOutlined />,
    title: { en: 'Request leave', sv: 'Ansök om frånvaro', nb: 'Søk om fravær' },
    steps: [
      { en: 'Send a leave request (vacation, sick) from the app — your admin approves it.', sv: 'Skicka en frånvaroansökan (semester, sjuk) från appen — din admin godkänner den.', nb: 'Send en fraværssøknad (ferie, sykdom) fra appen — administratoren din godkjenner den.' },
    ],
  },
];

export default function HelpPage() {
  const { lang } = useLanguage();
  const [audience, setAudience] = useState('admin');

  // Trilingual inline copy for the page chrome. Falls back to English for any
  // language without a value.
  const L = (en, sv, nb) => (lang === 'nb' ? nb : lang === 'sv' ? sv : en);

  const topics = audience === 'admin' ? ADMIN_TOPICS : WORKER_TOPICS;

  const items = useMemo(() => topics.map((topic, i) => ({
    key: String(i),
    label: (
      <span className="help__topic-label">
        <span className="help__topic-icon">{topic.icon}</span>
        {pick(lang, topic.title)}
      </span>
    ),
    children: (
      <>
        <ol className="help__steps">
          {topic.steps.map((step, j) => (
            <li key={j}>{pick(lang, step)}</li>
          ))}
        </ol>
        {topic.to ? (
          <Link href={topic.to} className="help__topic-link">
            {lang === 'nb' ? 'Åpne' : lang === 'sv' ? 'Öppna' : 'Open'} →
          </Link>
        ) : null}
      </>
    ),
  })), [topics, lang]);

  return (
    <div className="help">
      <div className="help__hero">
        <h1>{L('Help & getting started', 'Hjälp & kom igång', 'Hjelp og kom i gang')}</h1>
        <p>
          {L(
            'Short guides to get you going. Choose whether you are an admin (this web app) or a worker (the mobile app).',
            'Korta guider för att komma igång. Välj om du är administratör (den här webbappen) eller hantverkare (mobilappen).',
            'Korte guider for å komme i gang. Velg om du er administrator (denne nettappen) eller ansatt (mobilappen).',
          )}
        </p>
      </div>

      <Segmented
        value={audience}
        onChange={setAudience}
        options={[
          { value: 'admin', label: L('For admins', 'För administratörer', 'For administratorer') },
          { value: 'worker', label: L('For workers (app)', 'För hantverkare (app)', 'For ansatte (app)') },
        ]}
      />

      {audience === 'admin' ? (
        <section className="help__videos">
          <h2 className="help__videos-title">{L('Watch & learn', 'Titta & lär dig', 'Se og lær')}</h2>
          <div className="help__videos-grid">
            {TRAINING_VIDEOS.map((video) => (
              <div key={video.title.en} className="help__video">
                {video.url ? (
                  <div className="help__video-embed">
                    <iframe src={video.url} title={pick(lang, video.title)} allowFullScreen loading="lazy" />
                  </div>
                ) : (
                  <div className="help__video-ph">
                    <PlayCircleOutlined />
                    <span>{L('Video coming soon', 'Video kommer snart', 'Video kommer snart')}</span>
                  </div>
                )}
                <div className="help__video-cap">{pick(lang, video.title)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Collapse
        className="help__collapse"
        items={items}
        defaultActiveKey={['0']}
        bordered={false}
        accordion
      />

      <div className="help__footer">
        {L(
          'Stuck? Contact your admin or support.',
          'Kommer du inte vidare? Kontakta din administratör eller supporten.',
          'Kommer du ikke videre? Kontakt administratoren din eller support.',
        )}
      </div>
    </div>
  );
}
