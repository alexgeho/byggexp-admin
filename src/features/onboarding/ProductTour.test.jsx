// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useTourStore } from '@/src/store/tourStore';
import ProductTour from './ProductTour';

// The open state renders antd <Tour>, whose layout effects need
// ResizeObserver/measurement jsdom lacks; open/close logic is covered by
// tourStore.test.js. Here we assert the closed guard.
describe('ProductTour', () => {
  beforeEach(() => useTourStore.setState({ open: false }));

  it('renders nothing while the tour is closed', () => {
    const { container } = render(<ProductTour />);
    expect(container).toBeEmptyDOMElement();
  });
});
