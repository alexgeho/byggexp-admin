import { describe, expect, it } from 'vitest';
import { ledgerSide, sumUb } from './ledger';

const rows = [
  { account: 1930, ub: 150 },
  { account: 2440, ub: -50 },
  { account: 3001, ub: -1000 },
  { account: 4010, ub: 400.1 },
];

describe('ledger', () => {
  it('splits balance and result accounts', () => {
    expect(ledgerSide(rows, 'balance').map((r) => r.account)).toEqual([1930, 2440]);
    expect(ledgerSide(rows, 'result').map((r) => r.account)).toEqual([3001, 4010]);
  });

  it('result side sums to minus the profit', () => {
    expect(sumUb(rows, 'result')).toBe(-599.9);
  });
});
