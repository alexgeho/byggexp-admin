// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusTag from './StatusTag';

// No LanguageProvider: useLanguage()'s default context is { lang: 'en', ... }.
describe('StatusTag', () => {
  it('renders the registry label for a known status', () => {
    render(<StatusTag status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('applies the shared .status-tag pill class', () => {
    render(<StatusTag status="in_progress" />);
    expect(screen.getByText('In progress').closest('.status-tag')).not.toBeNull();
  });

  it('renders nothing for empty/nullish status', () => {
    const { container } = render(<StatusTag status="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uppercases the label when asked', () => {
    render(<StatusTag status="paid" upper />);
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown status', () => {
    render(<StatusTag status="mystery" />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });
});
