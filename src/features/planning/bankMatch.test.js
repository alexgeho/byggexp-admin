import { describe, expect, it } from 'vitest';
import { bankPayments, matchBankPayments } from './bankMatch';

const inv = (id, supplierName, total, dueDate, extra = {}) => ({ _id: id, supplierName, total, dueDate, status: 'registered', ...extra });

describe('bankPayments', () => {
  it('keeps only outgoing lines from a signed-amount export', () => {
    const cols = ['Bokföringsdag', 'Text', 'Belopp'];
    const rows = [['2026-10-05', 'BG 5278447046134', '-229,00'], ['2026-10-06', 'Inbetalning Agry', '22 500,00']];
    expect(bankPayments(cols, rows)).toEqual([{ date: '2026-10-05', description: 'BG 5278447046134', amount: -229 }]);
  });
});

describe('matchBankPayments', () => {
  const invoices = [
    inv('a', 'Parkman i Sverige AB', 229, '2026-10-04', { ocr: '5278 4470 4613 4' }),
    inv('b', 'Transportstyrelsen', 1200, '2026-10-12'),
    inv('c', 'Hyra AB', 9000, '2026-10-01'),
    inv('d', 'Gammal', 500, '2026-01-01'),
  ];
  const lines = [
    { date: '2026-10-05', description: 'BG 52784470461 34', amount: -229 },
    { date: '2026-10-10', description: 'TRANSPORTSTYRELSEN FORDONSSKATT', amount: -1200 },
    { date: '2026-10-02', description: 'Autogiro', amount: -9000 },
    { date: '2026-10-03', description: 'Okänd', amount: -500 },
  ];

  it('matches by OCR, name, then amount near the due date', () => {
    const m = matchBankPayments(lines, invoices);
    expect(m.map((x) => [x.invoice._id, x.line.date, x.sure])).toEqual([
      ['c', '2026-10-02', false],
      ['a', '2026-10-05', true],
      ['b', '2026-10-10', true],
    ]);
  });

  it('never reuses an invoice for two lines', () => {
    const twice = [lines[1], { ...lines[1], date: '2026-10-11' }];
    expect(matchBankPayments(twice, invoices)).toHaveLength(1);
  });

  it('skips paid invoices and amounts that differ', () => {
    expect(matchBankPayments(lines, [inv('x', 'Hyra AB', 9000, '2026-10-01', { status: 'paid' })])).toEqual([]);
    expect(matchBankPayments([{ ...lines[2], amount: -8000 }], invoices)).toEqual([]);
  });
});

describe('Swedish CSV export', () => {
  it('reads comma decimals and dates without shifting them', async () => {
    const { readBankSheet } = await import('@/src/features/projektkalkyl/excelImport');
    const txt = 'Bokföringsdag;Text;Belopp\n2026-10-05;BG 5278447046134 Parkman;-229,00\n2026-10-06;Inbetalning;22500,00\n';
    const file = { name: 'k.csv', type: 'text/csv', arrayBuffer: async () => new TextEncoder().encode(txt).buffer };
    const { columns, rows } = await readBankSheet(file);
    expect(bankPayments(columns, rows)).toEqual([{ date: '2026-10-05', description: 'BG 5278447046134 Parkman', amount: -229 }]);
  });
});
