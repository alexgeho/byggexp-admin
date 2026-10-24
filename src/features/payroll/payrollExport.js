import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { systemLabel } from './PayrollSettingsDrawer';

// Downloads the lönerunderlag file for the period (only `userIds` when given)
// and tells the user who was left out. The backend records the export, so the
// list can show who is already in the payroll system.
export async function downloadPayrollExport({
  from, to, userIds = [], settings, t,
}) {
  const format = settings?.exportFormat || 'paxml';
  const res = await apiClient.get('/payroll-basis/export', {
    params: { from, to, ...(userIds.length ? { userIds: userIds.join(',') } : {}) },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lonerunderlag-${from}-${to}.${format === 'csv' ? 'csv' : 'xml'}`;
  a.click();
  URL.revokeObjectURL(url);

  let skipped = [];
  try {
    skipped = JSON.parse(decodeURIComponent(res.headers['x-export-skipped'] || '%5B%5D'));
  } catch {
    skipped = [];
  }
  if (skipped.length) {
    const people = [...new Set(skipped.map((s) => s.name))].join(', ');
    appMessage.warning(`${t('Exported, but some rows were left out')}: ${people}`);
  } else {
    appMessage.success(`${t('File downloaded — import it in')} ${systemLabel(settings?.payrollSystem, t)}`);
  }
}
