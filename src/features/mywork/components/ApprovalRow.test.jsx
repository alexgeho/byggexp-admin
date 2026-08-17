// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ApprovalRow from './ApprovalRow';

const base = { key: 'k', id: '1', primary: 'Acme', secondary: '#42', amount: 1000 };
const noop = () => {};

describe('ApprovalRow', () => {
  it('expense: Approve and Reject call their callbacks with the row', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<ApprovalRow row={{ ...base, type: 'expense' }} onApprove={onApprove} onReject={onReject} onView={noop} />);

    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('supplier: has no Reject button', () => {
    render(<ApprovalRow row={{ ...base, type: 'supplier' }} onApprove={noop} onReject={noop} onView={noop} />);
    expect(screen.getByRole('button', { name: /Approve/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('certificate: shows View wired to onView, no Approve', () => {
    const onView = vi.fn();
    render(<ApprovalRow row={{ ...base, type: 'certificate', amount: null }} onApprove={noop} onReject={noop} onView={onView} />);
    expect(screen.queryByRole('button', { name: /Approve/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /View/ }));
    expect(onView).toHaveBeenCalledOnce();
  });
});
