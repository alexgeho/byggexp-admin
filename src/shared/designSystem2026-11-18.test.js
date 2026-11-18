import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guard for docs/design-system.md → "Что нельзя ломать (сводка на 2026-11-18)":
// the owner's decisions of 18.11. A change that undoes one of them fails here,
// before it reaches prod. Text-level checks on purpose — they pin the pieces
// that must stay, not their implementation.
const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

const hoursJsx = read('src/features/shifts/HoursPage.jsx');
const hoursScss = read('src/features/shifts/HoursPage.scss');
const hoursUtils = read('src/features/shifts/hoursUtils.js');
const offerForm = read('src/features/offers/components/OfferForm.jsx');
const invoiceForm = read('src/features/invoicing/components/InvoiceForm.jsx');
const customerBlock = read('src/features/clients/components/DocumentCustomerFields.jsx');
const subcontractorModal = read('src/features/users/components/SubcontractorCreateModal.jsx');
const invitePage = read('src/features/auth/InvitePage.jsx');
const capabilities = read('src/shared/config/companyCapabilities.js');

const hoursBar = hoursJsx.slice(hoursJsx.indexOf('className="hours-actionbar"'));

describe('hours grid — selection bar (18.11)', () => {
  it('keeps the total field and has no Fyll button', () => {
    expect(hoursBar).toContain('className="hours-fill"');
    expect(hoursBar).toContain('value={fillValue}');
    expect(hoursBar).not.toContain("t('Fill')");
  });

  it('has Rensa, Tidsunderlag, Skicka till lön as outlined buttons and one blue main action', () => {
    expect(hoursBar).toContain(`className="btn2" onClick={clearSel}>{t('Clear')}`);
    expect(hoursBar).toContain(`className="btn2" onClick={downloadSelectionTimesheet}>{t('Timesheet')}`);
    expect(hoursBar).toContain(`className="btn2" onClick={sendToPayroll}>{t('Send to payroll')}`);
    expect(hoursBar).toContain(`className="cta" onClick={draftInvoice}`);
    expect(hoursBar).not.toContain('link-btn');
  });

  it('is a light panel like the invoice form bar, and its buttons answer to the pointer', () => {
    expect(hoursScss).toContain('.hours-actionbar .inner { background:var(--h-panel); color:var(--h-ink);');
    expect(hoursScss).toContain('border-radius:16px');
    expect(hoursScss).toContain('.hours-actionbar .btn2:hover');
    expect(hoursScss).not.toContain('.hours-actionbar .inner { background:var(--h-rail)');
  });
});

describe('hours grid — period (18.11)', () => {
  it('opens on the last month up to today and restores only 2 weeks / month', () => {
    expect(hoursJsx).toContain("useState('month'); // 2w | month | custom");
    expect(hoursJsx).toContain("if (saved.mode === '2w' || saved.mode === 'month') setMode(saved.mode);");
    expect(hoursJsx).not.toContain('setOffset(saved.offset)');
    expect(hoursJsx).not.toContain('dayjs(saved.from)');
  });

  it('month means the last month up to today, not the calendar month', () => {
    expect(hoursUtils).toContain("return [end.subtract(1, 'month').add(1, 'day'), end];");
    expect(hoursUtils).not.toContain("month.startOf('month')");
  });
});

describe('offer and invoice — one customer block (18.11)', () => {
  it('both forms render the shared block and its hook', () => {
    for (const form of [offerForm, invoiceForm]) {
      expect(form).toContain('<DocumentCustomerFields customer={customer}');
      expect(form).toContain('useDocumentCustomer(form');
    }
  });

  it('the invoice form has no separate customer dropdown', () => {
    expect(invoiceForm).not.toContain("t('Select customer')");
  });

  it('the block has both halves, the picker label and saves a hand-typed customer', () => {
    expect(customerBlock).toContain("t('Create client')");
    expect(customerBlock).toContain("t('Choose existing client')");
    expect(customerBlock).toContain("t('Current clients list')");
    expect(customerBlock).toContain("apiClient.post('/clients'");
  });
});

describe('subcontractors (18.11)', () => {
  it('only the e-mail is required in «Ny underentreprenör», and it comes first', () => {
    const required = subcontractorModal.match(/required: true/g) || [];
    expect(required).toHaveLength(1);
    const email = subcontractorModal.indexOf('name="email"');
    const name = subcontractorModal.indexOf('name="name"');
    expect(email).toBeGreaterThan(-1);
    expect(email).toBeLessThan(name);
    expect(subcontractorModal.slice(email, name)).toContain('required: true');
  });

  it("a subcontractor's contact is kept to its own people and their hours", () => {
    expect(capabilities).toContain("SUBCONTRACTOR_NAV_KEYS = ['users', 'shifts']");
    expect(capabilities).toContain("SUBCONTRACTOR_PATHS = ['/company/users', '/company/shifts', '/company/profile']");
    expect(hoursJsx).toContain("=== 'subcontractor';");
    expect(hoursJsx).toContain('if (readOnly || basis !==');
  });
});

describe('invitation page (18.11)', () => {
  it('shows the e-mail as a readable login, not a disabled field', () => {
    expect(invitePage).toContain('readOnly className="auth-form-email"');
    expect(invitePage).not.toContain('<Input value={invite.email} disabled />');
  });
});
