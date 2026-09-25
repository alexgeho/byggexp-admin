// Block catalogue for the newsletter editor. Field lists drive the generic
// block form; the backend (ByggExp-BackEnd src/newsletters/newsletter-render.ts)
// renders the same shapes to e-mail HTML and ignores anything it doesn't know.

export const BLOCK_TYPES = [
  {
    type: 'heading',
    label: 'Heading',
    defaults: { text: 'Ny rubrik', level: 'h2' },
    fields: [
      { key: 'text', label: 'Text', kind: 'text' },
      {
        key: 'level',
        label: 'Size',
        kind: 'select',
        options: [
          { value: 'h1', label: 'Large' },
          { value: 'h2', label: 'Medium' },
        ],
      },
    ],
    summary: (b) => b.text,
  },
  {
    type: 'text',
    label: 'Text',
    defaults: { text: 'Skriv din text här.', muted: false },
    fields: [
      { key: 'text', label: 'Text', kind: 'textarea', hint: 'formatHint' },
      { key: 'muted', label: 'Grey text', kind: 'switch' },
    ],
    summary: (b) => b.text,
  },
  {
    type: 'image',
    label: 'Image',
    defaults: { src: '', alt: '', href: '', fullWidth: false },
    fields: [
      { key: 'src', label: 'Image', kind: 'image' },
      { key: 'alt', label: 'Alt text (shown if images are blocked)', kind: 'text' },
      { key: 'href', label: 'Link (optional)', kind: 'url' },
      { key: 'fullWidth', label: 'Full width (600px)', kind: 'switch' },
    ],
    summary: (b) => b.alt || b.src,
  },
  {
    type: 'button',
    label: 'Button',
    defaults: { label: 'Boka demo', href: 'https://byggexp.se/sv/contact', variant: 'filled' },
    fields: [
      { key: 'label', label: 'Button text', kind: 'text' },
      { key: 'href', label: 'Link', kind: 'url' },
      {
        key: 'variant',
        label: 'Style',
        kind: 'select',
        options: [
          { value: 'filled', label: 'Filled' },
          { value: 'outline', label: 'Outline' },
        ],
      },
    ],
    summary: (b) => b.label,
  },
  {
    type: 'card',
    label: 'Product card',
    defaults: {
      title: 'Produkt från 499 kr/mån',
      text: 'Kort beskrivning av funktionen.',
      image: '',
      imageAlt: '',
      href: 'https://byggexp.se/sv/funktioner',
      linkLabel: 'Pris & funktioner',
    },
    fields: [
      { key: 'title', label: 'Heading', kind: 'text' },
      { key: 'text', label: 'Text', kind: 'textarea', hint: 'formatHint' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'imageAlt', label: 'Alt text (shown if images are blocked)', kind: 'text' },
      { key: 'href', label: 'Link', kind: 'url' },
      { key: 'linkLabel', label: 'Link text under the image', kind: 'text' },
    ],
    summary: (b) => b.title,
  },
  {
    type: 'spacer',
    label: 'Spacing',
    defaults: { height: 40 },
    fields: [{ key: 'height', label: 'Height (px)', kind: 'number', min: 8, max: 160 }],
    summary: (b) => `${b.height}px`,
  },
  {
    type: 'divider',
    label: 'Divider',
    defaults: {},
    fields: [],
    summary: () => '',
  },
];

export const BLOCK_MAP = Object.fromEntries(BLOCK_TYPES.map((d) => [d.type, d]));

export const newBlockId = () =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const createBlock = (type) => ({
  id: newBlockId(),
  type,
  ...structuredClone(BLOCK_MAP[type]?.defaults || {}),
});
