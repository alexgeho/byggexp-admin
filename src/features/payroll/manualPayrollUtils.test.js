import { describe, expect, it } from 'vitest';
import {
  buildPayload, changeType, initialRows, rowAmount, totalGross,
} from './manualPayrollUtils';

const users = [
  { _id: 'u2', name: 'Bo', hourlyRate: null },
  { _id: 'u1', name: 'Anna', hourlyRate: 200 },
];
const period = { from: '2026-10-01', to: '2026-10-31' };

describe('manual payroll form', () => {
  it('starts with one normal row per worker at the stored timlön', () => {
    const rows = initialRows(users);
    expect(rows.map((r) => [r.name, r.type, r.rate])).toEqual([
      ['Anna', 'normal', 200],
      ['Bo', 'normal', null],
    ]);
  });

  it('loads the rows of a run being edited first', () => {
    const run = {
      lines: [{
        userId: 'u2',
        name: 'Bo',
        items: [{ type: 'monthly', amount: 32000 }, { type: 'other', label: 'Bonus', amount: 500 }],
      }],
    };
    const rows = initialRows(users, run);
    expect(rows.map((r) => [r.userId, r.type, r.amount ?? r.hours])).toEqual([
      ['u2', 'monthly', 32000],
      ['u2', 'other', 500],
      ['u1', 'normal', null],
    ]);
  });

  it('prices rows and builds the payload without empty rows', () => {
    const [anna, bo] = initialRows(users);
    const rows = [
      { ...anna, hours: 160 },
      { ...anna, key: 'x', type: 'overtime', hours: 10, rate: 300 },
      changeType({ ...bo, hours: 8 }, 'monthly'),
    ];
    rows[2].amount = 32000;
    expect(rows.map(rowAmount)).toEqual([32000, 3000, 32000]);
    expect(totalGross(rows)).toBe(67000);
    expect(buildPayload([...rows, { ...bo, key: 'y' }], period)).toEqual({
      periodFrom: '2026-10-01',
      periodTo: '2026-10-31',
      employees: [
        {
          userId: 'u1',
          items: [
            { type: 'normal', hours: 160, rate: 200 },
            { type: 'overtime', hours: 10, rate: 300 },
          ],
        },
        { userId: 'u2', items: [{ type: 'monthly', amount: 32000 }] },
      ],
    });
  });
});
