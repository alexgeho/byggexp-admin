// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskStatusTag from './TaskStatusTag';

// useT() falls back to an identity translator without a provider.
describe('TaskStatusTag', () => {
  it('labels a completed task', () => {
    render(<TaskStatusTag task={{ status: 'completed' }} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('labels an overdue task', () => {
    const past = new Date(Date.now() - 3 * 86400000).toISOString();
    render(<TaskStatusTag task={{ status: 'open', dueDate: past }} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('labels an open task', () => {
    render(<TaskStatusTag task={{ status: 'open' }} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders as the shared .status-tag pill', () => {
    render(<TaskStatusTag task={{ status: 'open' }} />);
    expect(screen.getByText('Open').closest('.status-tag')).not.toBeNull();
  });
});
