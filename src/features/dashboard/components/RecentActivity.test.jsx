// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentActivity from './RecentActivity';

describe('RecentActivity', () => {
  it('lists activity messages', () => {
    render(<RecentActivity items={[
      { id: '1', message: 'Signed in', createdAt: '2026-06-15T10:00:00Z' },
      { id: '2', message: 'Created project', createdAt: '2026-06-15T09:00:00Z' },
    ]} />);
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('Created project')).toBeInTheDocument();
  });

  it('shows an empty state when there is no activity', () => {
    render(<RecentActivity items={[]} />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
