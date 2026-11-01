// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentDetailDrawer from './PaymentDetailDrawer';

window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
}));

const record = {
  _id: 'i1', _kind: 'receivable', _tone: 'overdue', _manual: false,
  amount: 1000, dueDate: '2026-01-01', label: 'Kund', invoiceNumber: 5,
};

describe('PaymentDetailDrawer — reminder button', () => {
  it('shows "Send reminder" when a reminder handler is given (Sweden)', () => {
    render(<PaymentDetailDrawer open record={record} currency="SEK" onClose={() => {}} onSendReminder={async () => {}} />);
    expect(screen.getByText('Send reminder')).toBeInTheDocument();
  });

  it('hides it without a handler (Norway)', () => {
    render(<PaymentDetailDrawer open record={record} currency="NOK" onClose={() => {}} />);
    expect(screen.queryByText('Send reminder')).toBeNull();
  });
});
