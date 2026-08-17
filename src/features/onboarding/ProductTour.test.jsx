// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Not the home path, so the auto-launch effect stays inert during the test.
vi.mock('next/navigation', () => ({ usePathname: () => '/company/projects' }));

import { useTourStore } from '@/src/store/tourStore';
import ProductTour from './ProductTour';

// The open state renders antd <Tour>, whose internal layout effects need
// ResizeObserver/measurement that jsdom lacks; the open/close logic itself is
// covered by tourStore.test.js. Here we assert the closed guard.
describe('ProductTour', () => {
  beforeEach(() => useTourStore.setState({ open: false }));

  it('renders nothing while the tour is closed', () => {
    const { container } = render(<ProductTour />);
    expect(container).toBeEmptyDOMElement();
  });
});
