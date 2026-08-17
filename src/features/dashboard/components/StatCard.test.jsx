// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard color="blue" icon={<span>i</span>} label="Active projects" value={7} />);
    expect(screen.getByText('Active projects')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows a signed positive trend', () => {
    render(<StatCard color="green" icon={<span>i</span>} label="X" value={1} trendValue={5} />);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('shows a negative trend without a plus', () => {
    render(<StatCard color="orange" icon={<span>i</span>} label="Y" value={1} trendValue={-3} />);
    expect(screen.getByText('-3')).toBeInTheDocument();
  });
});
