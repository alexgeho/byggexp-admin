import { describe, expect, it } from 'vitest';
import { missingRecurringInvoices } from './recurringSuppliers';

const inv = (supplierName, invoiceDate, total = 1000, extra = {}) => ({ supplierName, invoiceDate, total, ...extra });
const NOW = new Date(2026, 9, 20).getTime(); // 20 Oct 2026

describe('missingRecurringInvoices', () => {
  it('flags a monthly supplier whose bill is past its usual day', () => {
    const list = [inv('Transportstyrelsen', '2026-08-12'), inv('Transportstyrelsen', '2026-09-11', 1200)];
    expect(missingRecurringInvoices(list, NOW)).toEqual([
      { key: 'transportstyrelsen', supplierName: 'Transportstyrelsen', expectedDate: '2026-10-11', lastAmount: 1200 },
    ]);
  });

  it('is quiet once this month’s bill arrived', () => {
    const list = [inv('Hyra AB', '2026-08-01'), inv('Hyra AB', '2026-09-01'), inv('Hyra AB', '2026-10-02')];
    expect(missingRecurringInvoices(list, NOW)).toEqual([]);
  });

  it('waits a grace period after the usual day', () => {
    const list = [inv('If', '2026-08-18'), inv('If', '2026-09-18')];
    expect(missingRecurringInvoices(list, NOW)).toEqual([]);
  });

  it('ignores one-off suppliers and those not billed last month', () => {
    const list = [inv('Byggmax', '2026-09-03'), inv('Ahlsell', '2026-07-03'), inv('Ahlsell', '2026-08-03')];
    expect(missingRecurringInvoices(list, NOW)).toEqual([]);
  });

  it('groups by org number and skips credit notes', () => {
    const list = [
      inv('Folksam', '2026-08-05', 500, { supplierOrgNumber: '502006-1585' }),
      inv('Folksam Sak', '2026-09-05', 500, { supplierOrgNumber: '5020061585' }),
      inv('Folksam', '2026-10-05', -500, { supplierOrgNumber: '502006-1585', creditOfId: 'x' }),
    ];
    expect(missingRecurringInvoices(list, NOW).map((r) => r.supplierName)).toEqual(['Folksam Sak']);
  });
});
