// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard icon={<span>i</span>} label="Active projects" value={7} />);
    expect(screen.getByText('Active projects')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
