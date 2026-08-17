// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionCard from './SectionCard';

describe('SectionCard', () => {
  it('renders the title and children', () => {
    render(<SectionCard title="Personnel overview"><p>body</p></SectionCard>);
    expect(screen.getByText('Personnel overview')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('renders a View all footer link when actionHref is given', () => {
    render(<SectionCard title="X" actionHref="/company/users">rows</SectionCard>);
    const link = screen.getByRole('link', { name: 'View all' });
    expect(link).toHaveAttribute('href', '/company/users');
  });

  it('omits the footer link without actionHref', () => {
    render(<SectionCard title="X">rows</SectionCard>);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
