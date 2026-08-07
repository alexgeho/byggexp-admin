'use client';

import { useEffect, useMemo, useState } from 'react';
import { Avatar, InputNumber, Popconfirm, Select, Spin, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, CloseOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useAssignmentStore } from '@/src/store/assignmentStore';
import { getEntityId } from '@/src/utils/entityId';
import { IconButton, LinkButton } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import './BemanningPage.scss';

const DAY = 86400000;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const startOfWeekMonday = (input) => {
  const d = new Date(input);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const ymd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const isoWeek = (input) => {
  const d = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((d - firstThursday) / (7 * DAY));
};

export default function BemanningPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;
  const isSuper = user?.role === 'superadmin';

  const { assignments, loading, fetchRange, create, remove } = useAssignmentStore();
  const usersAll = useUserStore((s) => s.users);
  const fetchUsersByCompany = useUserStore((s) => s.fetchByCompany);
  const fetchAllUsers = useUserStore((s) => s.fetchAll);
  const projects = useProjectStore((s) => s.projects);
  const fetchProjectsByCompany = useProjectStore((s) => s.fetchByCompany);
  const fetchAllProjects = useProjectStore((s) => s.fetchAll);

  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [absences, setAbsences] = useState([]);
  const [projectFilter, setProjectFilter] = useState(undefined);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignProjectId, setAssignProjectId] = useState(undefined);
  const [assignHours, setAssignHours] = useState(8);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = ymd(days[0]);
  const to = ymd(days[6]);
  const todayYmd = ymd(new Date());

  useEffect(() => {
    if (isSuper) {
      fetchAllUsers({ silent: true });
      fetchAllProjects();
    } else if (companyId) {
      fetchUsersByCompany(companyId, { silent: true });
      fetchProjectsByCompany(companyId);
    }
  }, [isSuper, companyId, fetchAllUsers, fetchAllProjects, fetchUsersByCompany, fetchProjectsByCompany]);

  useEffect(() => {
    fetchRange(from, to, projectFilter);
    apiClient.get('/leave', { params: { status: 'approved' } })
      .then((r) => setAbsences(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAbsences([]));
  }, [from, to, projectFilter, fetchRange]);

  const workers = useMemo(() => usersAll.filter((u) => u.role === 'worker'), [usersAll]);
  const projectColor = (projectId) => {
    const idx = projects.findIndex((p) => getEntityId(p) === String(projectId));
    return `p${((idx < 0 ? 0 : idx) % 6) + 1}`;
  };
  const projectName = (projectId) => {
    const p = projects.find((pr) => getEntityId(pr) === String(projectId));
    return p?.name || '—';
  };

  const byCell = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const key = `${String(a.userId)}|${ymd(new Date(a.date))}`;
      (map[key] = map[key] || []).push(a);
    });
    return map;
  }, [assignments]);

  const absenceByCell = useMemo(() => {
    const set = new Set();
    absences.forEach((leave) => {
      const uid = String(leave.userId);
      if (!uid || !leave.startDate) return;
      let d = new Date(leave.startDate);
      const end = new Date(leave.endDate || leave.startDate);
      let guard = 0;
      while (d <= end && guard < 366) {
        set.add(`${uid}|${ymd(d)}`);
        d = addDays(d, 1);
        guard += 1;
      }
    });
    return set;
  }, [absences]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: getEntityId(p), label: p.name })),
    [projects],
  );

  const openAssign = (userId, dateYmd) => {
    setAssignTarget({ userId, dateYmd });
    setAssignProjectId(projectFilter || undefined);
    setAssignHours(8);
  };

  const submitAssign = async () => {
    if (!assignProjectId || !assignTarget) return;
    setSaving(true);
    try {
      await create({
        userId: assignTarget.userId,
        projectId: assignProjectId,
        date: assignTarget.dateYmd,
        hours: assignHours || 8,
      });
      setAssignTarget(null);
    } catch {
      /* store surfaces the error */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bemanning">
      <div className="bemanning__toolbar">
        <div className="bemanning__weeknav">
          <IconButton onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('Previous week')}><LeftOutlined /></IconButton>
          <span className="wk">{t('Week')} {isoWeek(weekStart)}</span>
          <IconButton onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t('Next week')}><RightOutlined /></IconButton>
          <LinkButton onClick={() => setWeekStart(startOfWeekMonday(new Date()))}>{t('Today')}</LinkButton>
        </div>
        <div className="bemanning__filters">
          <ProjectFilterSelect value={projectFilter} onChange={setProjectFilter} />
        </div>
      </div>

      {loading && !assignments.length ? (
        <div className="bemanning__spin"><Spin /></div>
      ) : (
        <div className="bemanning__board">
          <div className="bemanning__scroll">
            <div className="bemanning__grid">
              <div className="bemanning__cell bemanning__head bemanning__emp bemanning__emp--head">{t('Employee')}</div>
              {days.map((d) => {
                const isToday = ymd(d) === todayYmd;
                return (
                  <div key={ymd(d)} className={`bemanning__cell bemanning__head${isToday ? ' bemanning__head--today' : ''}`}>
                    <span className="dow">{t(DOW[(d.getDay() + 6) % 7])}</span>
                    <span className="date">{d.getDate()}/{d.getMonth() + 1}</span>
                  </div>
                );
              })}

              {workers.map((worker) => {
                const uid = getEntityId(worker);
                return (
                  <BemanningRow
                    key={uid}
                    worker={worker}
                    uid={uid}
                    days={days}
                    todayYmd={todayYmd}
                    byCell={byCell}
                    absenceByCell={absenceByCell}
                    projectColor={projectColor}
                    projectName={projectName}
                    onAdd={openAssign}
                    onRemove={remove}
                    t={t}
                  />
                );
              })}

              {!workers.length ? (
                <div className="bemanning__cell bemanning__empty" style={{ gridColumn: '1 / -1' }}>{t('No employees found')}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <p className="bemanning__foot">{t('Click an empty cell to assign · click a chip to remove · absences come from the Leave module · red = overbooked')}</p>

      <AdminModal
        title={t('Assign')}
        open={Boolean(assignTarget)}
        onCancel={() => setAssignTarget(null)}
        onSave={submitAssign}
        saveText={t('Assign')}
        saveDisabled={!assignProjectId}
        saveLoading={saving}
        width={460}
        destroyOnHidden
      >
        <div className="bemanning__assign-form">
          <label className="bemanning__field">
            <span>{t('Project')}</span>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t('Select project')}
              value={assignProjectId}
              onChange={setAssignProjectId}
              options={projectOptions}
              style={{ width: '100%' }}
            />
          </label>
          <label className="bemanning__field">
            <span>{t('Hours')}</span>
            <InputNumber min={0} max={24} value={assignHours} onChange={(v) => setAssignHours(v ?? 8)} style={{ width: '100%' }} />
          </label>
        </div>
      </AdminModal>
    </div>
  );
}

function BemanningRow({ worker, uid, days, todayYmd, byCell, absenceByCell, projectColor, projectName, onAdd, onRemove, t }) {
  const initials = (worker.name || worker.email || 'U').charAt(0).toUpperCase();
  return (
    <>
      <div className="bemanning__cell bemanning__emp">
        <Avatar size={32} className="bemanning__avatar">{initials}</Avatar>
        <span>
          <span className="bemanning__emp-name">{worker.name || worker.email}</span>
          {worker.profession ? <span className="bemanning__emp-role">{worker.profession}</span> : null}
        </span>
      </div>
      {days.map((d) => {
        const key = `${uid}|${ymd(d)}`;
        const items = byCell[key] || [];
        const absent = absenceByCell.has(key);
        const totalHours = items.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
        const isToday = ymd(d) === todayYmd;
        return (
          <div
            key={key}
            className={`bemanning__cell bemanning__day${isToday ? ' bemanning__day--today' : ''}`}
            onClick={() => { if (!absent) onAdd(uid, ymd(d)); }}
            role="button"
            tabIndex={0}
          >
            {absent ? <div className="bemanning__absence">{t('Absent')}</div> : null}
            {items.map((a) => (
              <Popconfirm
                key={a._id}
                title={t('Remove assignment?')}
                okText={t('Remove')}
                cancelText={t('Cancel')}
                onConfirm={() => onRemove(a._id)}
              >
                <div
                  className={`bemanning__chip bemanning__chip--${projectColor(a.projectId)}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="name">{projectName(a.projectId)}</span>
                  <span className="hrs">{a.hours} h <CloseOutlined className="x" /></span>
                </div>
              </Popconfirm>
            ))}
            {totalHours > 8 ? <span className="bemanning__over">{totalHours} h · {t('overbooked')}</span> : null}
            {!items.length && !absent ? <span className="bemanning__add">+</span> : null}
          </div>
        );
      })}
    </>
  );
}
