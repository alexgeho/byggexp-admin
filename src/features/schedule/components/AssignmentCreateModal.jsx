import { useEffect, useState } from 'react';
import { DatePicker, InputNumber } from 'antd';
import AdminModal from '@/src/shared/components/AdminModal';
import dayjs from 'dayjs';
import { Select } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';

// Create a new assignment: pick one or more workers, a project, a date range and hours/day.
// `initial` ({ workerId, date }) prefills from a clicked empty cell.
export default function AssignmentCreateModal({ open, initial, employees, projects, onCancel, onCreate }) {
  const t = useT();
  const [workerIds, setWorkerIds] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [hours, setHours] = useState(8);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const day = initial?.date ? dayjs(initial.date) : dayjs();
      setWorkerIds(initial?.workerId ? [initial.workerId] : []);
      setProjectId(null);
      setFrom(day);
      setTo(day);
      setHours(8);
    }
  }, [open, initial]);

  const projectOptions = (projects || []).map((p) => ({ value: String(p._id || p.id), label: p.name || 'Project' }));
  const invalid = !workerIds.length || !projectId || !from || !to || to.isBefore(from, 'day');

  return (
    <AdminModal
      open={open}
      title={t('Assign to project')}
      onCancel={onCancel}
      saveText={t('Assign')}
      saveDisabled={invalid}
      width={460}
      onSave={() => onCreate({ workerIds, projectId, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD'), hours: hours || 8 })}
    >
      <div className="schedule-assign-modal">
        <label className="schedule-assign-modal__field">
          <span>{t('Employee')}</span>
          <Select mode="multiple" open={pickerOpen} onOpenChange={setPickerOpen} onSelect={() => setPickerOpen(false)} value={workerIds} onChange={setWorkerIds} options={employees} showSearch optionFilterProp="label" placeholder={t('Select employee')} style={{ width: '100%' }} />
        </label>
        <label className="schedule-assign-modal__field">
          <span>{t('Project')}</span>
          <Select value={projectId} onChange={setProjectId} options={projectOptions} showSearch optionFilterProp="label" placeholder={t('Select project')} style={{ width: '100%' }} />
        </label>
        <div className="schedule-assign-modal__dates">
          <label className="schedule-assign-modal__field">
            <span>{t('From')}</span>
            <DatePicker value={from} onChange={setFrom} allowClear={false} style={{ width: '100%' }} />
          </label>
          <label className="schedule-assign-modal__field">
            <span>{t('To')}</span>
            <DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} />
          </label>
        </div>
        <label className="schedule-assign-modal__field">
          <span>{t('Hours')}</span>
          <InputNumber min={0} max={24} value={hours} onChange={(v) => setHours(v ?? 8)} style={{ width: '100%' }} />
        </label>
      </div>
    </AdminModal>
  );
}
