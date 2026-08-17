import { create } from 'zustand';

// Tiny controller for the product tour so the header "Take a tour" button and
// the auto-launch-on-first-visit logic can both drive the same <ProductTour>.
export const useTourStore = create((set) => ({
  open: false,
  start: () => set({ open: true }),
  close: () => set({ open: false }),
}));
