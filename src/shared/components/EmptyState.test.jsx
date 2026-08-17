// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No projects yet" description="Create your first one" />);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first one')).toBeInTheDocument();
  });

  it('renders the CTA and fires onAction', () => {
    const onAction = vi.fn();
    render(<EmptyState title="X" actionLabel="Create project" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('omits the CTA when no action is given', () => {
    render(<EmptyState title="X" description="Y" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
