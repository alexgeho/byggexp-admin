import { useEffect, useState } from 'react';
import { DatePicker, InputNumber, Modal } from 'antd';
import dayjs from 'dayjs';
import { Select } from '@/src/ui-kit';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

// Plan a whole crew (Arbetslag) onto a project for a date range in one action.
export default function TeamAssignModal({ open, teams, projects, onCancel, onCreate }) {
  const t = useT();
  const [teamId, setTeamId] = useState(undefined);
  const [projectId, setProjectId] = useState(undefined);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [hours, setHours] = useState(8);

  useEffect(() => {
    if (open) {
      setTeamId(teams[0] ? getEntityId(teams[0]) : undefined);
      setProjectId(undefined);
      setFrom(dayjs());
      setTo(dayjs());
      setHours(8);
    }
  }, [open, teams]);

  const team = teams.find((tm) => getEntityId(tm) === String(teamId));
  const members = (team?.memberIds || []).map(String);
  const invalid = !members.length || !projectId || !from || !to || to.isBefore(from, 'day');

  return (
    <Modal
      open={open}
      title={t('Assign team')}
      onCancel={onCancel}
      okText={t('Assign')}
      okButtonProps={{ disabled: invalid }}
      onOk={() => onCreate({ memberIds: members, projectId, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD'), hours: hours || 8 })}
    >
      <div className="schedule-assign-modal">
        <label className="schedule-assign-modal__field">
          <span>{t('Team')}</span>
          <Select
            value={teamId}
            onChange={setTeamId}
            options={teams.map((tm) => ({ value: getEntityId(tm), label: `${tm.name} (${(tm.memberIds || []).length})` }))}
            style={{ width: '100%' }}
          />
        </label>
        <label className="schedule-assign-modal__field">
          <span>{t('Project')}</span>
          <Select
            value={projectId}
            onChange={setProjectId}
            options={(projects || []).map((p) => ({ value: String(p._id || p.id), label: p.name || 'Project' }))}
            showSearch
            optionFilterProp="label"
            placeholder={t('Select project')}
            style={{ width: '100%' }}
          />
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
    </Modal>
  );
}
