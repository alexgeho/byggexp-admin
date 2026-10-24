// Demo month for the Lucas / Byggavtalet screenshots — LOCAL backend only.
const API = 'http://localhost:3000';
const PW = 'demo1234'; // seed-demo.ts test password
const H = 3600000;
const P1 = '6adbafaab625727cf1bee338'; // Villa Solsidan
const P2 = '6adbafaab625727cf1bee33f'; // Vasastan

async function call(token, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const login = async (email) => (await call(null, 'POST', '/auth/login', { email, password: PW }));

const weekdays = [];
for (let d = 1; d <= 23; d++) {
  const date = `2026-10-${String(d).padStart(2, '0')}`;
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (wd !== 0 && wd !== 6) weekdays.push(date);
}

// Per worker: day → extras on top of an 8 h day.
const plans = {
  'worker1@byggexp.dev': { project: P1, km: 34, travel: 40, days: {
    '2026-10-02': { ot: 2, note: 'Takstolar levererade sent, monterade klart' },
    '2026-10-07': { ob: 2, note: 'Kvällsgjutning grund' },
    '2026-10-09': { perDiem: 'full', km: 120, travel: 90 },
    '2026-10-15': { ot: 1.5 },
    '2026-10-20': { ob: 2.5, note: 'Kvällsarbete, kran bokad 18–21' },
    '2026-10-21': { ot: 2, pending: true, note: 'Gjutning plan 2 drog ut' },
    '2026-10-23': { ot: 2, ob: 0.5, perDiem: 'half', pending: true, note: 'Gjutning plan 3, väntade på betongbil 1 h' },
  } },
  'worker2@byggexp.dev': { project: P2, km: 0, travel: 0, days: {
    '2026-10-06': { ot: 1 },
    '2026-10-13': { ob: 3, note: 'Rivning efter kontorstid enligt BRF' },
    '2026-10-14': { leave: true },
    '2026-10-16': { km: 48, travel: 60, note: 'Hämtade material i Arlandastad' },
    '2026-10-22': { ob: 2, pending: true },
  } },
  'worker3@byggexp.dev': { project: P2, km: 22, travel: 30, days: {
    '2026-10-08': { perDiem: 'full', km: 140, travel: 120, note: 'Ställningsmontage Uppsala' },
    '2026-10-09': { perDiem: 'full', km: 140, travel: 120 },
    '2026-10-12': { ot: 2 },
    '2026-10-19': { ob: 1.5 },
    '2026-10-22': { leave: true },
    '2026-10-23': { ot: 1, pending: true },
  } },
};

const admin = await login('admin@byggexp.dev');
const A = admin.access_token;
const created = [];
for (const [email, plan] of Object.entries(plans)) {
  const w = await login(email);
  for (const date of weekdays) {
    const x = plan.days[date] || {};
    if (x.leave) continue;
    const ot = x.ot || 0;
    const ob = x.ob || 0;
    const body = {
      workerId: w.user.id,
      projectId: plan.project,
      date,
      durationMs: Math.round((8 + ot + ob) * H),
      overtimeMs: Math.round(ot * H),
      obMs: Math.round(ob * H),
      travelMinutes: x.travel ?? plan.travel,
      travelKm: x.km ?? plan.km,
      perDiem: x.perDiem || 'none',
      ...(x.note ? { dayNote: x.note } : {}),
    };
    const shift = await call(w.access_token, 'POST', '/shifts/manual', body);
    const id = shift._id || shift.id;
    created.push({ email, date, id, ot, ob, pending: !!x.pending });
  }
}

// Manager: earlier days decided + attested; the last days stay in "Att göra".
for (const s of created) {
  if (s.pending) continue;
  if (s.ot) await call(A, 'PATCH', `/shifts/${s.id}/overtime`, { approved: true });
  if (s.ob) await call(A, 'PATCH', `/shifts/${s.id}/ob`, { approved: true });
  await call(A, 'PATCH', `/shifts/${s.id}/approval`, { approved: true });
}

// Frånvaro: Johan sick 14.10 (approved), Karl VAB 22.10 (waiting).
const w2 = await login('worker2@byggexp.dev');
const sick = await call(w2.access_token, 'POST', '/leave', { type: 'sick', startDate: '2026-10-14', endDate: '2026-10-14' });
await call(A, 'PATCH', `/leave/${sick._id || sick.id}/review`, { status: 'approved' });
const w3 = await login('worker3@byggexp.dev');
await call(w3.access_token, 'POST', '/leave', { type: 'vab', startDate: '2026-10-22', endDate: '2026-10-22' });

console.log(`shifts ${created.length}, pending ${created.filter((s) => s.pending).length}`);
