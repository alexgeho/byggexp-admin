import { describe, it, expect } from 'vitest';
import { buildWorkerProjectBreakdown, uniqueSheetName } from './hoursByProject';

const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
// Stand-in for the Hours page rule: manual hours, empty cells read as null.
const dayValue = (c) => (c.manual ? c.manual : null);

describe('buildWorkerProjectBreakdown', () => {
  const workers = [
    { workerId: 'w1', name: 'Anna' },
    { workerId: 'w2', name: 'Bo' },
  ];
  const projectGrids = [
    {
      projectName: 'Alpha',
      workers: [
        { workerId: 'w1', cells: { '2026-09-01': { manual: 8 }, '2026-09-02': { manual: 4 } } },
        { workerId: 'w2', cells: { '2026-09-01': { manual: 0 } } }, // nothing logged
      ],
    },
    {
      projectName: 'Beta',
      workers: [{ workerId: 'w1', cells: { '2026-09-02': { manual: 3.5 } } }],
    },
  ];

  it('gives each employee one row per project they logged hours on', () => {
    const [anna, ...rest] = buildWorkerProjectBreakdown({ workers, projectGrids, dates, dayValue });

    expect(rest).toEqual([]); // Bo logged nothing, so he is left out
    expect(anna.name).toBe('Anna');
    expect(anna.rows).toEqual([
      { name: 'Alpha', cells: [8, 4, null], total: 12 },
      { name: 'Beta', cells: [null, 3.5, null], total: 3.5 },
    ]);
    expect(anna.dailyTotals).toEqual([8, 7.5, 0]);
    expect(anna.total).toBe(15.5);
  });

  it('passes each cell its date so per-day rules can use it', () => {
    const seen = [];
    buildWorkerProjectBreakdown({
      workers,
      projectGrids,
      dates,
      dayValue: (c) => { seen.push(c.date); return null; },
    });
    expect(seen).toContain('2026-09-02');
  });
});

describe('uniqueSheetName', () => {
  it('strips forbidden characters, caps at 31 chars and de-duplicates', () => {
    const used = new Set();
    expect(uniqueSheetName('A/B: [x]', used)).toBe('A B x');
    const long = 'Aleksandra Konstantinopolskaya-Smith';
    const first = uniqueSheetName(long, used);
    const second = uniqueSheetName(long, used);
    expect(first).toHaveLength(31);
    expect(second).toHaveLength(31);
    expect(second.endsWith(' (2)')).toBe(true);
  });
});
