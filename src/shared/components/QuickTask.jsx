'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Popover, Segmented, Select } from 'antd';
import { CalendarOutlined, FlagOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useAuthStore } from '@/src/store/authStore';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import { parseQuickTask, dueChipLabel } from '@/src/utils/parseQuickTask';
import './QuickTask.scss';

// Frictionless task capture: a floating "+" opens a single field — type,
// Enter, done. Understands natural dates ("ring peter imorgon", "på fredag")
// and priority ("!"), defaults to a personal task; a project is optional.
// Stays open so several ideas can be fired off in a row. The command palette
// (⌘K) opens this via a `quicktask:open` event.
export default function QuickTask() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(undefined);
  const [priority, setPriority] = useState('normal');
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef(null);

  // The command palette (and any other trigger) opens capture via an event.
  useEffect(() => {
    const openHandler = () => {
      setNow(Date.now());
      setOpen(true);
    };
    window.addEventListener('quicktask:open', openHandler);
    return () => window.removeEventListener('quicktask:open', openHandler);
  }, []);

  // Load projects (for the optional picker) the first time it opens.
  useEffect(() => {
    if (!open || projects.length) return;
    const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
    apiClient.get(url).then(({ data }) => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
  }, [open, projects.length, user?.role]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: getEntityId(p), label: p.name })),
    [projects],
  );

  const parsed = useMemo(() => parseQuickTask(title, now), [title, now]);
  const effectivePriority = parsed.priority === 'high' ? 'high' : priority;
  const dueChip = dueChipLabel(parsed.dueMs, now, t);

  const save = async () => {
    const result = parseQuickTask(title, Date.now());
    const text = result.title.trim();
    if (!text || saving) return;
    setSaving(true);
    const start = new Date();
    const due = result.dueMs != null ? new Date(result.dueMs) : new Date(Date.now() + 7 * 86400000);
    const finalPriority = result.priority === 'high' ? 'high' : priority;
    const base = {
      taskTitle: text,
      status: 'open',
      priority: finalPriority,
      startDate: start.toISOString(),
      dueDate: due.toISOString(),
    };
    const payload = projectId
      ? { ...base, projectId }
      : { ...base, assigneeUserId: user?.id || user?._id || user?.userId };
    try {
      await apiClient.post('/tasks', payload);
      appMessage.success(t('Task added'));
      setTitle('');
      setPriority('normal');
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not add task'));
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="quick-task">
      <input
        ref={inputRef}
        className="quick-task__input"
        value={title}
        placeholder={t('What needs doing?')}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div className="quick-task__chips">
        {dueChip ? (
          <span className="quick-task__chip"><CalendarOutlined /> {dueChip}</span>
        ) : null}
        <span className={`quick-task__chip quick-task__chip--${effectivePriority}`}>
          <FlagOutlined /> {t({ low: 'Low', normal: 'Normal', high: 'High' }[effectivePriority])}
        </span>
      </div>
      <Segmented
        size="small"
        block
        value={effectivePriority}
        onChange={setPriority}
        options={[
          { value: 'low', label: t('Low') },
          { value: 'normal', label: t('Normal') },
          { value: 'high', label: t('High') },
        ]}
      />
      <div className="quick-task__row">
        <Select
          allowClear
          showSearch
          size="small"
          optionFilterProp="label"
          className="quick-task__project"
          placeholder={t('Personal (no project)')}
          value={projectId}
          onChange={setProjectId}
          options={projectOptions}
        />
        <Button type="primary" size="small" loading={saving} onClick={save}>
          {t('Add')}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={t('Quick task')}
      trigger="click"
      placement="topRight"
      open={open}
      onOpenChange={(v) => {
        if (v) setNow(Date.now());
        setOpen(v);
      }}
    >
      <button type="button" className="quick-task__fab" aria-label={t('Quick task')}>
        <PlusOutlined />
      </button>
    </Popover>
  );
}
