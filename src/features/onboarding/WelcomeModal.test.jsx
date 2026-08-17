// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { path } = vi.hoisted(() => ({ path: { value: '/company' } }));
vi.mock('next/navigation', () => ({ usePathname: () => path.value }));

import { useAuthStore } from '@/src/store/authStore';
import WelcomeModal from './WelcomeModal';

describe('WelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: { id: 'u1', name: 'Anna Berg' } });
    path.value = '/company';
  });

  it('does not open away from the overview', () => {
    path.value = '/company/projects';
    render(<WelcomeModal homePath="/company" />);
    expect(screen.queryByText(/Welcome to Byggexp/)).toBeNull();
  });

  it('greets a first-time user on the overview', () => {
    render(<WelcomeModal homePath="/company" />);
    expect(screen.getByText(/Welcome to Byggexp, Anna/)).toBeInTheDocument();
  });

  it('marks itself seen when dismissed (so it never reappears)', () => {
    render(<WelcomeModal homePath="/company" />);
    fireEvent.click(screen.getByRole('button', { name: 'Explore on my own' }));
    expect(localStorage.getItem('byggexp.welcome.seen.v1.u1')).toBe('1');
  });

  it('stays hidden once seen', () => {
    localStorage.setItem('byggexp.welcome.seen.v1.u1', '1');
    render(<WelcomeModal homePath="/company" />);
    expect(screen.queryByText(/Welcome to Byggexp/)).toBeNull();
  });
});
