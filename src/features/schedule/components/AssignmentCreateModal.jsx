import { useEffect, useState } from 'react';
import { DatePicker, Modal } from 'antd';
import dayjs from 'dayjs';
import { Select } from '@/src/ui-kit';

// Create a new assignment: pick a worker, a project and a date range.
export default function AssignmentCreateModal({ open, employees, projects, onCancel, onCreate }) {
  const [workerId, setWorkerId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());

  useEffect(() => {
    if (open) {
      setWorkerId(null);
      setProjectId(null);
      setFrom(dayjs());
      setTo(dayjs());
    }
  }, [open]);

  const projectOptions = (projects || []).map((p) => ({ value: String(p._id || p.id), label: p.name || 'Project' }));
  const invalid = !workerId || !projectId || !from || !to || to.isBefore(from, 'day');

  return (
    <Modal
      open={open}
      title="Assign to project"
      onCancel={onCancel}
      okText="Assign"
      okButtonProps={{ disabled: invalid }}
      onOk={() => onCreate({ workerId, projectId, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') })}
    >
      <div className="schedule-assign-modal">
        <label className="schedule-assign-modal__field">
          <span>Employee</span>
          <Select value={workerId} onChange={setWorkerId} options={employees} showSearch optionFilterProp="label" placeholder="Select employee" style={{ width: '100%' }} />
        </label>
        <label className="schedule-assign-modal__field">
          <span>Project</span>
          <Select value={projectId} onChange={setProjectId} options={projectOptions} showSearch optionFilterProp="label" placeholder="Select project" style={{ width: '100%' }} />
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
