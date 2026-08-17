'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Collapse, Segmented } from 'antd';
import {
  ApartmentOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  FileTextOutlined,
  MobileOutlined,
  PlayCircleOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useTourStore } from '@/src/store/tourStore';
import './HelpPage.scss';

// Training videos for the admin web app. Drop a YouTube/Loom embed URL into
// `url` and the card renders the player; until then it shows a "coming soon"
// placeholder so the section is ready the moment content exists.
const TRAINING_VIDEOS = [
  { title: { en: 'Quick start: set up your company', sv: 'Snabbstart: ställ in ditt företag' }, url: null },
  { title: { en: 'Projects, shifts & the hours grid', sv: 'Projekt, pass & timrutnätet' }, url: null },
  { title: { en: 'From offer to invoice (with ROT)', sv: 'Från offert till faktura (med ROT)' }, url: null },
];

// In-app help / getting-started guide. Long-form content is kept bilingual
// inline ({ en, sv }) rather than in the messages.js UI dictionary — docs read
// better authored as whole paragraphs than as fragmented keys. Two audiences:
// company admins (this web app) and workers (the mobile app), toggled at top.

const pick = (lang, pair) => (lang === 'sv' ? pair.sv : pair.en);

// Each topic: an icon, a title, and an ordered list of short steps. `to` links
// straight to the screen that does the thing (admin topics only).
const ADMIN_TOPICS = [
  {
    icon: <ApartmentOutlined />,
    to: '/company/profile',
    title: { en: 'Set up your company', sv: 'Ställ in ditt företag' },
    steps: [
      { en: 'Open Profile and fill in your company name, org. number and address — these appear on every offer and invoice.', sv: 'Öppna Profil och fyll i företagsnamn, org.nummer och adress — de visas på varje offert och faktura.' },
      { en: 'Add your logo and set your VAT and ROT defaults so documents are correct from the start.', sv: 'Lägg till din logotyp och ange moms- och ROT-standarder så att dokumenten blir rätt från början.' },
    ],
  },
  {
    icon: <TeamOutlined />,
    to: '/company/users',
    title: { en: 'Add your team & set roles', sv: 'Lägg till ditt team & roller' },
    steps: [
      { en: 'Under Users, invite each employee by name and email. They use that email to sign in to the mobile app.', sv: 'Under Användare bjuder du in varje anställd med namn och e-post. De loggar in i mobilappen med den e-posten.' },
      { en: 'Pick a role: Worker (logs shifts and photos), Project admin (runs a project), or Company admin (full access).', sv: 'Välj en roll: Hantverkare (registrerar pass och foton), Projektadmin (driver ett projekt) eller Företagsadmin (full åtkomst).' },
      { en: 'You can promote someone to Company admin later from their profile.', sv: 'Du kan uppgradera någon till Företagsadmin senare från deras profil.' },
    ],
  },
  {
    icon: <ApartmentOutlined />,
    to: '/company/projects',
    title: { en: 'Create and run projects', sv: 'Skapa och driv projekt' },
    steps: [
      { en: 'Create a project, then assign the workers who belong to it.', sv: 'Skapa ett projekt och tilldela sedan de hantverkare som hör till det.' },
      { en: 'Set the site location and work hours — shifts are tracked against this and hours are compared to plan.', sv: 'Ange arbetsplatsens läge och arbetstider — pass registreras mot detta och timmar jämförs med planen.' },
      { en: 'Everything ties to the project: shifts, tasks, photos, blueprints, diary (Dagbok) and costs.', sv: 'Allt kopplas till projektet: pass, uppgifter, foton, ritningar, dagbok och kostnader.' },
    ],
  },
  {
    icon: <ClockCircleOutlined />,
    to: '/company/shifts',
    title: { en: 'Time & shifts', sv: 'Tid & arbetspass' },
    steps: [
      { en: 'Workers start and stop shifts in the mobile app; location confirms they are on site.', sv: 'Hantverkare startar och avslutar pass i mobilappen; platsen bekräftar att de är på arbetsplatsen.' },
      { en: 'Open Shifts to see live who is working, and the Hours grid to compare planned vs. actual hours.', sv: 'Öppna Arbetspass för att se vem som jobbar just nu, och timrutnätet för att jämföra planerade mot faktiska timmar.' },
      { en: 'Adjust or correct hours in the grid before you export them to payroll.', sv: 'Justera eller korrigera timmar i rutnätet innan du exporterar dem till lön.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    to: '/company/my-work',
    title: { en: 'Tasks & reminders', sv: 'Uppgifter & påminnelser' },
    steps: [
      { en: 'Assign a task to a project or a person, with a due date and priority.', sv: 'Tilldela en uppgift till ett projekt eller en person, med förfallodatum och prioritet.' },
      { en: 'Set a reminder so the assignee is nudged — repeat until it is confirmed done.', sv: 'Ställ in en påminnelse så att mottagaren puffas — upprepa tills den bekräftas klar.' },
      { en: 'Use Repeat for recurring jobs (weekly site cleaning, monthly checks). My work is your daily to-do surface.', sv: 'Använd Upprepa för återkommande jobb (veckostädning, månadskontroller). Mitt arbete är din dagliga att-göra-vy.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    to: '/company/invoicing/offers',
    title: { en: 'Offers & invoices', sv: 'Offerter & fakturor' },
    steps: [
      { en: 'Add a client, then create an offer — the AI can draft priced rows from a short description.', sv: 'Lägg till en kund och skapa sedan en offert — AI:n kan skapa prissatta rader från en kort beskrivning.' },
      { en: 'Convert an accepted offer into an invoice. Apply ROT deduction for private customers.', sv: 'Omvandla en accepterad offert till en faktura. Tillämpa ROT-avdrag för privatkunder.' },
      { en: 'Send by email as a PDF. Corrections go out as a credit note — sent invoices stay unchanged.', sv: 'Skicka som PDF via e-post. Rättelser görs som kreditfaktura — skickade fakturor ändras inte.' },
    ],
  },
  {
    icon: <ShopOutlined />,
    to: '/company/invoicing/supplier-invoices',
    title: { en: 'Purchases, expenses & payroll', sv: 'Inköp, utlägg & lön' },
    steps: [
      { en: 'Register purchase invoices and photograph expense receipts — scanning reads the amounts for you.', sv: 'Registrera inköpsfakturor och fotografera kvitton — skanningen läser av beloppen åt dig.' },
      { en: 'Approve what your team submits from the My work inbox.', sv: 'Godkänn det ditt team skickar in från Mitt arbete-inkorgen.' },
      { en: 'Run payroll from logged hours: gross → tax → net, with payslips per employee.', sv: 'Kör lön från registrerade timmar: brutto → skatt → netto, med lönespecifikationer per anställd.' },
    ],
  },
];

const WORKER_TOPICS = [
  {
    icon: <MobileOutlined />,
    title: { en: 'Sign in to the app', sv: 'Logga in i appen' },
    steps: [
      { en: 'Download the ByggExp app and sign in with the email your company invited you with.', sv: 'Ladda ner ByggExp-appen och logga in med den e-post ditt företag bjöd in dig med.' },
      { en: 'If you cannot sign in, ask your admin to check your account is added and approved.', sv: 'Om du inte kan logga in, be din admin kontrollera att ditt konto är tillagt och godkänt.' },
    ],
  },
  {
    icon: <ClockCircleOutlined />,
    title: { en: 'Start & end a shift', sv: 'Starta & avsluta ett pass' },
    steps: [
      { en: 'On site, open the project and start your shift. Allow location so it registers you as present.', sv: 'På plats, öppna projektet och starta ditt pass. Tillåt plats så registreras du som närvarande.' },
      { en: 'End the shift when you leave. Your hours are sent to the office automatically.', sv: 'Avsluta passet när du går. Dina timmar skickas till kontoret automatiskt.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    title: { en: 'Upload photos', sv: 'Ladda upp foton' },
    steps: [
      { en: 'During a shift, take or upload photos of the work — they attach to the project for the office to see.', sv: 'Under ett pass, ta eller ladda upp foton av arbetet — de kopplas till projektet så kontoret ser dem.' },
    ],
  },
  {
    icon: <FileTextOutlined />,
    title: { en: 'Your tasks', sv: 'Dina uppgifter' },
    steps: [
      { en: 'See the tasks assigned to you, and tick them off when done.', sv: 'Se uppgifterna som tilldelats dig och bocka av dem när de är klara.' },
      { en: 'If you get a reminder, confirm the task is finished so it stops nudging you.', sv: 'Om du får en påminnelse, bekräfta att uppgiften är klar så slutar den puffa dig.' },
    ],
  },
  {
    icon: <TeamOutlined />,
    title: { en: 'Request leave', sv: 'Ansök om frånvaro' },
    steps: [
      { en: 'Send a leave request (vacation, sick) from the app — your admin approves it.', sv: 'Skicka en frånvaroansökan (semester, sjuk) från appen — din admin godkänner den.' },
    ],
  },
];

export default function HelpPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const startTour = useTourStore((state) => state.start);
  const [audience, setAudience] = useState('admin');

  // The tour spotlights the company overview, so jump there first, then start
  // it once that page has mounted (the tour store persists across the nav).
  const replayTour = () => {
    router.push('/company');
    setTimeout(() => startTour(), 500);
  };

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
            {lang === 'sv' ? 'Öppna' : 'Open'} →
          </Link>
        ) : null}
      </>
    ),
  })), [topics, lang]);

  return (
    <div className="help">
      <div className="help__hero">
        <h1>{lang === 'sv' ? 'Hjälp & kom igång' : 'Help & getting started'}</h1>
        <p>
          {lang === 'sv'
            ? 'Korta guider för att komma igång. Välj om du är administratör (den här webbappen) eller hantverkare (mobilappen).'
            : 'Short guides to get you going. Choose whether you are an admin (this web app) or a worker (the mobile app).'}
        </p>
        <Button icon={<CompassOutlined />} onClick={replayTour}>
          {lang === 'sv' ? 'Ta produktrundturen' : 'Take the product tour'}
        </Button>
      </div>

      <Segmented
        value={audience}
        onChange={setAudience}
        options={[
          { value: 'admin', label: lang === 'sv' ? 'För administratörer' : 'For admins' },
          { value: 'worker', label: lang === 'sv' ? 'För hantverkare (app)' : 'For workers (app)' },
        ]}
      />

      {audience === 'admin' ? (
        <section className="help__videos">
          <h2 className="help__videos-title">{lang === 'sv' ? 'Titta & lär dig' : 'Watch & learn'}</h2>
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
                    <span>{lang === 'sv' ? 'Video kommer snart' : 'Video coming soon'}</span>
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
        {lang === 'sv'
          ? 'Kommer du inte vidare? Kontakta din administratör eller supporten.'
          : 'Stuck? Contact your admin or support.'}
      </div>
    </div>
  );
}
