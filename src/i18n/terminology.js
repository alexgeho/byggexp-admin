// Product terminology: what the UI calls a "project". Owner decision 2026-11-11:
// the whole admin says "Order" instead of "Projekt" (service/plumbing firms book
// orders, not projects). Applied to every translated string in t(), so menus,
// titles, buttons, columns and toasts all follow without editing each entry.
// Order matters: specific phrases (gender/definite forms) before the bare stem.

const keepCase = (match, repl) => (match[0] === match[0].toUpperCase()
  ? repl.charAt(0).toUpperCase() + repl.slice(1)
  : repl);

const rules = {
  sv: [
    [/\b(ett|nytt|inget|detta|namnlöst|aktuellt) projekt\b/gi, (m, w) => {
      const map = { ett: 'en', nytt: 'ny', inget: 'ingen', detta: 'denna', namnlöst: 'namnlös', aktuellt: 'aktuell' };
      return `${keepCase(w, map[w.toLowerCase()])} order`;
    }],
    [/projektledare/gi, (m) => keepCase(m, 'orderansvarig')],
    [/projektets/gi, (m) => keepCase(m, 'orderns')],
    [/projektet/gi, (m) => keepCase(m, 'ordern')],
    [/projekten/gi, (m) => keepCase(m, 'ordrarna')],
    [/projekt/gi, (m) => keepCase(m, 'order')],
  ],
  nb: [
    [/prosjektleder/gi, (m) => keepCase(m, 'ordreansvarlig')],
    [/prosjektet/gi, (m) => keepCase(m, 'ordren')],
    [/prosjektene/gi, (m) => keepCase(m, 'ordrene')],
    [/prosjekt/gi, (m) => keepCase(m, 'ordre')],
  ],
  en: [
    [/\ba project\b/gi, (m) => keepCase(m, 'an order')],
    [/projects/gi, (m) => keepCase(m, 'orders')],
    [/project/gi, (m) => keepCase(m, 'order')],
  ],
  ru: [
    [/проект/gi, (m) => keepCase(m, 'заказ')],
  ],
};

export function applyTerminology(lang, s) {
  if (typeof s !== 'string') return s;
  const list = rules[lang];
  if (!list) return s;
  return list.reduce((acc, [re, fn]) => acc.replace(re, fn), s);
}
