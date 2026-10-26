import { formatClientName } from '@/src/utils/clientName';

// Constants and pure helpers for the project create/edit form.

export const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
];

// Ordertyp: a normal project or a work order kind (service, jour…).
export const ORDER_TYPE_OPTIONS = [
  { value: 'project', label: 'Project' },
  { value: 'service', label: 'Service' },
  { value: 'installation', label: 'Installation' },
  { value: 'jour', label: 'On-call' },
  { value: 'garanti', label: 'Warranty' },
];

export const clientOptionLabel = (client, t) => formatClientName(client) || t('Unnamed client');

export const normalizeAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
