import { useEffect, useState } from 'react';
import { Button, DatePicker, Modal } from 'antd';
import dayjs from 'dayjs';
import { Select } from '@/src/ui-kit';

// Edit an existing assignment bar: change project, shift/resize its dates, or
// remove it. Persisted as day-rows by the parent (delete + recreate the range).
export default function AssignmentEditModal({ bar, projects, onCancel, onSave, onDelete }) {
  const [projectId, setProjectId] = useState(null);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  useEffect(() => {
    if (bar) {
      setProjectId(bar.projectId);
      setFrom(dayjs(bar.dates[0]));
      setTo(dayjs(bar.dates[bar.dates.length - 1]));
    }
  }, [bar]);

  const projectOptions = (projects || []).map((p) => ({ value: String(p._id || p.id), label: p.name || 'Project' }));
  const invalid = !projectId || !from || !to || to.isBefore(from, 'day');

  return (
    <Modal
      open={Boolean(bar)}
      title="Edit assignment"
      onCancel={onCancel}
      footer={[
        <Button key="del" danger onClick={onDelete}>Delete</Button>,
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button key="save" type="primary" disabled={invalid} onClick={() => onSave({ projectId, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') })}>Save</Button>,
      ]}
    >
      <div className="schedule-assign-modal">
        <p className="schedule-assign-modal__row">Employee: <b>{bar?.workerName}</b></p>
        <label className="schedule-assign-modal__field">
          <span>Project</span>
          <Select value={projectId} onChange={setProjectId} options={projectOptions} showSearch optionFilterProp="label" style={{ width: '100%' }} />
        </label>
        <div className="schedule-assign-modal__dates">
          <label className="schedule-assign-modal__field">
            <span>From</span>
            <DatePicker value={from} onChange={setFrom} allowClear={false} style={{ width: '100%' }} />
          </label>
          <label className="schedule-assign-modal__field">
            <span>To</span>
            <DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} />
          </label>
        </div>
      </div>
    </Modal>
  );
}
