'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, DatePicker, Popover, Segmented, Select } from 'antd';
import dayjs from 'dayjs';
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
  // Opened from «Ny bokning»: explicit deadline + reminder (owner 12.11). The floating «+» stays as it was.
  const [fromBooking, setFromBooking] = useState(false);
  const [due, setDue] = useState(null);
  const [remindEvery, setRemindEvery] = useState(15);

  // The command palette (and any other trigger) opens capture via an event.
  useEffect(() => {
    const openHandler = (e) => {
      setNow(Date.now());
      // A caller (e.g. the booking window) can preset the order the task belongs to.
      if (e?.detail?.projectId) setProjectId(String(e.detail.projectId));
      const booking = !!e?.detail?.fromBooking;
      setFromBooking(booking);
      if (booking) { setDue(e.detail.due ? dayjs(e.detail.due) : null); setRemindEvery(15); }
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
    const parsedDue = result.dueMs != null ? new Date(result.dueMs) : new Date(Date.now() + 7 * 86400000);
    const dueAt = fromBooking && due ? due.toDate() : parsedDue;
    const finalPriority = result.priority === 'high' ? 'high' : priority;
    const base = {
      taskTitle: text,
      status: 'open',
      priority: finalPriority,
      startDate: start.toISOString(),
      dueDate: dueAt.toISOString(),
    };
    if (fromBooking && remindEvery > 0) {
      base.notificationSettings = {
        assignees: [], allMembersNotification: !!projectId, autoReminder: false, customReminder: false, customMessage: '',
        repeat: 'none', repeatIntervalMinutes: remindEvery, remindUntilDone: true, maxReminders: 0, escalateToBoss: false, escalateToUserIds: [],
      };
    }
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
      {fromBooking ? (
        <div className="quick-task__row">
          <DatePicker
            size="small"
            showTime={{ format: 'HH:mm', minuteStep: 15 }}
            format="YYYY-MM-DD HH:mm"
            value={due}
            onChange={setDue}
            placeholder={t('Deadline')}
            needConfirm={false}
            className="quick-task__due"
          />
          <Select
            size="small"
            className="quick-task__remind"
            value={remindEvery}
            onChange={setRemindEvery}
            options={[0, 15, 30, 60, 1440].map((v) => ({ value: v, label: t(v === 0 ? 'Off' : v === 15 ? 'Every 15 min' : v === 30 ? 'Every 30 min' : v === 60 ? 'Every hour' : 'Every day') }))}
            aria-label={t('Reminder')}
          />
        </div>
      ) : null}
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
