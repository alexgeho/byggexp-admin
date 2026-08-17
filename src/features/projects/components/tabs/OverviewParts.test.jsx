// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewInfoRow, ProjectOverviewStatItem } from './OverviewParts';

describe('OverviewInfoRow', () => {
  it('renders the label and value', () => {
    render(<OverviewInfoRow label="Client" value="Acme AB" />);
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Acme AB')).toBeInTheDocument();
  });
  it('renders nothing when the value is empty', () => {
    const { container } = render(<OverviewInfoRow label="Client" value="" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ProjectOverviewStatItem', () => {
  it('shows the label and value', () => {
    render(<ProjectOverviewStatItem color="blue" icon={<span>i</span>} label="Total hours" value="12h" />);
    expect(screen.getByText('Total hours')).toBeInTheDocument();
    expect(screen.getByText('12h')).toBeInTheDocument();
  });
});
