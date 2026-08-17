import { describe, it, expect, beforeEach } from 'vitest';
import { useTourStore } from './tourStore';

describe('tourStore', () => {
  beforeEach(() => useTourStore.setState({ open: false }));
  it('starts closed', () => {
    expect(useTourStore.getState().open).toBe(false);
  });
  it('start() opens and close() closes', () => {
    useTourStore.getState().start();
    expect(useTourStore.getState().open).toBe(true);
    useTourStore.getState().close();
    expect(useTourStore.getState().open).toBe(false);
  });
});
