// Skattereduktion kinds on an invoice — mirrors the backend's invoice-math.
// rate × labour, capped at max kr. label = picker, short = totals line.
export const DEDUCTION_TYPES = {
  rot: { rate: 0.3, max: 50000, label: 'ROT 30%', short: 'ROT-avdrag' },
  rut: { rate: 0.5, max: 75000, label: 'RUT 50%', short: 'RUT-avdrag' },
  green15: { rate: 0.15, max: 50000, label: 'Green tech · solar 15%', short: 'Green tech' },
  green50: { rate: 0.5, max: 50000, label: 'Green tech · battery/charger 50%', short: 'Green tech' },
};
