// Bokföring helpers. Accounts 1xxx–2xxx = balance sheet, 3xxx–8xxx = result.

export const ledgerSide = (rows, side) =>
  rows.filter((r) => (side === 'balance' ? r.account < 3000 : r.account >= 3000));

// Sum of closing balances on one side (result side: negative = profit).
export const sumUb = (rows, side) =>
  Math.round(ledgerSide(rows, side).reduce((s, r) => s + r.ub, 0) * 100) / 100;
