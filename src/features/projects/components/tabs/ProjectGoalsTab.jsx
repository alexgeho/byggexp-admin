import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select, message } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { useTaskStore } from '@/src/store/taskStore';
import { getProjectGoal, updateProjectGoal } from '@/src/api/goals';
import { formatApiError } from '@/src/utils/formError';
import './ProjectGoalsTab.scss';

const SPLIT_PRESETS = [5, 10, 15];

const taskProjectId = (task) =>
  (typeof task.projectId === 'object' ? task.projectId?._id : task.projectId);
const taskLabel = (task) => task?.taskTitle || task?.title || 'Task';
const isDone = (task) => task?.status === 'completed';

// Circular progress ring.
function ProgressRing({ percent }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <svg className="goals-ring" width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} className="goals-ring__track" />
      <circle
        cx="42"
        cy="42"
        r={r}
        className="goals-ring__value"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 42 42)"
      />
      <text x="42" y="47" textAnchor="middle" className="goals-ring__label">{percent}%</text>
    </svg>
  );
}

export default function ProjectGoalsTab({ projectId }) {
  const t = useT();
  const { tasks, fetchAllAccessible, complete, reopen } = useTaskStore();
  const [title, setTitle] = useState('');
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void fetchAllAccessible().catch(() => {});
  }, [fetchAllAccessible]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getProjectGoal(projectId)
      .then((goal) => {
        setTitle(goal?.title || '');
        setStages(
          (goal?.stages || [])
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s, i) => ({ key: s._id || `s${i}`, title: s.title || '', taskIds: (s.taskIds || []).map(String) })),
        );
        setDirty(false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const projectTasks = useMemo(
    () => (tasks || []).filter((task) => String(taskProjectId(task)) === String(projectId)),
    [tasks, projectId],
  );
  const taskById = useMemo(() => {
    const map = new Map();
    projectTasks.forEach((task) => map.set(String(task._id), task));
    return map;
  }, [projectTasks]);

  // Resolve each stage's tasks and completion, then derive status + overall %.
  const stageInfo = useMemo(() => {
    let firstIncomplete = -1;
    const rows = stages.map((stage) => {
      const stageTasks = stage.taskIds.map((id) => taskById.get(String(id))).filter(Boolean);
      const done = stageTasks.filter(isDone).length;
      const total = stageTasks.length;
      const complete = total > 0 && done === total;
      return { stageTasks, done, total, complete };
    });
    firstIncomplete = rows.findIndex((r) => !r.complete);
    const withStatus = rows.map((r, i) => ({
      ...r,
      status:
        firstIncomplete === -1 || i < firstIncomplete
          ? 'done'
          : i === firstIncomplete
            ? 'in_progress'
            : 'upcoming',
    }));
    const totalTasks = withStatus.reduce((s, r) => s + r.total, 0);
    const doneTasks = withStatus.reduce((s, r) => s + r.done, 0);
    const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return { rows: withStatus, totalTasks, doneTasks, percent };
  }, [stages, taskById]);

  const assignedIds = useMemo(() => {
    const set = new Set();
    stages.forEach((s) => s.taskIds.forEach((id) => set.add(String(id))));
    return set;
  }, [stages]);
  const unassignedTasks = useMemo(
    () => projectTasks.filter((task) => !assignedIds.has(String(task._id))),
    [projectTasks, assignedIds],
  );

  const mutate = useCallback((updater) => {
    setStages((prev) => updater(prev));
    setDirty(true);
  }, []);

  const splitInto = (n) => mutate(() =>
    Array.from({ length: n }, (_, i) => ({ key: `s${i}-${n}`, title: `${t('Stage')} ${i + 1}`, taskIds: [] })));
  const addStage = () => mutate((prev) => [...prev, { key: `s${prev.length}-${Date.now() % 100000}`, title: `${t('Stage')} ${prev.length + 1}`, taskIds: [] }]);
  const removeStage = (idx) => mutate((prev) => prev.filter((_, i) => i !== idx));
  const renameStage = (idx, value) => mutate((prev) => prev.map((s, i) => (i === idx ? { ...s, title: value } : s)));
  const moveStage = (idx, dir) => mutate((prev) => {
    const j = idx + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = prev.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  });
  const assignTask = (idx, taskId) => mutate((prev) => prev.map((s, i) => {
    const stripped = { ...s, taskIds: s.taskIds.filter((id) => String(id) !== String(taskId)) };
    return i === idx ? { ...stripped, taskIds: [...stripped.taskIds, String(taskId)] } : stripped;
  }));
  const unassignTask = (idx, taskId) => mutate((prev) => prev.map((s, i) =>
    (i === idx ? { ...s, taskIds: s.taskIds.filter((id) => String(id) !== String(taskId)) } : s)));

  const toggleTask = async (task) => {
    try {
      if (isDone(task)) await reopen(task._id);
      else await complete(task._id);
    } catch (err) {
      message.error(formatApiError(err, 'Failed to update task'));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProjectGoal(projectId, {
        title,
        stages: stages.map((s, i) => ({ title: s.title, taskIds: s.taskIds, order: i })),
      });
      setDirty(false);
      message.success(t('Goal saved'));
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save goal'));
    } finally {
      setSaving(false);
    }
  };

  const STATUS_LABEL = {
    done: t('Done'),
    in_progress: t('In progress'),
    upcoming: t('Upcoming'),
  };

  return (
    <div className="goals-tab">
      <div className="goals-header">
        <div className="goals-header__main">
          <input
            className="goals-title-input"
            placeholder={t('Goal (e.g. Deliver the project on time)')}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          />
          <div className="goals-header__sub">
            {stageInfo.doneTasks}/{stageInfo.totalTasks} {t('tasks done')} · {stages.length} {t('stages')}
          </div>
        </div>
        <ProgressRing percent={stageInfo.percent} />
      </div>

      {stages.length === 0 ? (
        <div className="goals-empty">
          <p className="goals-empty__text">{t('Break this goal into stages, then group the project tasks under them.')}</p>
          <div className="goals-empty__split">
            <span>{t('Split into')}</span>
            {SPLIT_PRESETS.map((n) => (
              <button type="button" key={n} className="goals-split-btn" onClick={() => splitInto(n)}>{n}</button>
            ))}
            <Button icon={<PlusOutlined />} variant="secondary" onClick={addStage}>{t('Add stage')}</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="goals-roadmap">
            {stages.map((stage, idx) => {
              const info = stageInfo.rows[idx] || { stageTasks: [], done: 0, total: 0, status: 'upcoming' };
              return (
                <div key={stage.key} className={`goals-stage goals-stage--${info.status}`}>
                  <div className="goals-stage__rail">
                    <span className="goals-stage__dot">{info.status === 'done' ? <CheckOutlined /> : idx + 1}</span>
                    {idx < stages.length - 1 ? <span className="goals-stage__line" /> : null}
                  </div>
                  <div className="goals-stage__card">
                    <div className="goals-stage__head">
                      <input
                        className="goals-stage__title"
                        value={stage.title}
                        placeholder={`${t('Stage')} ${idx + 1}`}
                        onChange={(e) => renameStage(idx, e.target.value)}
                      />
                      <span className={`goals-pill goals-pill--${info.status}`}>{STATUS_LABEL[info.status]}</span>
                      <span className="goals-stage__count">{info.done}/{info.total}</span>
                      <span className="goals-stage__actions">
                        <button type="button" title={t('Move up')} onClick={() => moveStage(idx, -1)} disabled={idx === 0}><ArrowUpOutlined /></button>
                        <button type="button" title={t('Move down')} onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1}><ArrowDownOutlined /></button>
                        <button type="button" title={t('Remove')} className="goals-stage__del" onClick={() => removeStage(idx)}><DeleteOutlined /></button>
                      </span>
                    </div>
                    <div className="goals-stage__bar"><span style={{ width: `${info.total ? Math.round((info.done / info.total) * 100) : 0}%` }} /></div>

                    <ul className="goals-stage__tasks">
                      {info.stageTasks.map((task) => (
                        <li key={task._id} className={`goals-task${isDone(task) ? ' goals-task--done' : ''}`}>
                          <button type="button" className="goals-task__check" onClick={() => toggleTask(task)} aria-label={t('Toggle complete')}>
                            {isDone(task) ? <CheckOutlined /> : null}
                          </button>
                          <span className="goals-task__title">{taskLabel(task)}</span>
                          <button type="button" className="goals-task__remove" title={t('Remove from stage')} onClick={() => unassignTask(idx, task._id)}>×</button>
                        </li>
                      ))}
                    </ul>

                    <Select
                      className="goals-stage__add"
                      placeholder={t('Add a task to this stage')}
                      showSearch
                      value={null}
                      optionFilterProp="label"
                      onChange={(taskId) => assignTask(idx, taskId)}
                      options={unassignedTasks.map((task) => ({ value: String(task._id), label: taskLabel(task) }))}
                      notFoundContent={t('No unassigned tasks')}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="goals-footer">
            <Button icon={<PlusOutlined />} variant="secondary" onClick={addStage}>{t('Add stage')}</Button>
            <Button onClick={save} disabled={saving || !dirty} loading={saving}>{t('Save changes')}</Button>
          </div>
        </>
      )}

      {loading ? null : null}
    </div>
  );
}
