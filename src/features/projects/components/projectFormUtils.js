import { formatClientName } from '@/src/utils/clientName';

// Constants and pure helpers for the project create/edit form.

export const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
];

export const clientOptionLabel = (client, t) => formatClientName(client) || t('Unnamed client');

export const normalizeAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
