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
  const [people, setPeople] = useState([]); // [{ value, label }] — staff, from the booking window
  const [crew, setCrew] = useState([]); // people booked in that window
  const [forWhom, setForWhom] = useState('all'); // 'all' = everyone in the order, 'one' = one person (owner 12.11)
  const [personId, setPersonId] = useState(undefined);

  // The command palette (and any other trigger) opens capture via an event.
  useEffect(() => {
    const openHandler = (e) => {
      setNow(Date.now());
      // A caller (e.g. the booking window) can preset the order the task belongs to.
      if (e?.detail?.projectId) setProjectId(String(e.detail.projectId));
      const booking = !!e?.detail?.fromBooking;
      setFromBooking(booking);
      if (booking) {
        // From a booking the order is always the booking's own (none for a new one) — never a
        // leftover from the previous opening (it may be deleted by now → «Project … not found»).
        setProjectId(e.detail.projectId ? String(e.detail.projectId) : undefined);
        setDue(e.detail.due ? dayjs(e.detail.due) : null);
        setRemindEvery(15);
        setPeople(e.detail.people || []);
        setCrew(e.detail.crew || []);
        setForWhom('all');
        setPersonId(undefined);
      }
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
    const me = user?.id || user?._id || user?.userId;
    const nameOf = (id) => people.find((p) => String(p.value) === String(id))?.label || '';
    const payloads = [];
    if (fromBooking && forWhom === 'one' && personId) {
      // One person: the task goes to that person (in the order when there is one).
      if (projectId) {
        payloads.push({ ...base, projectId, notificationSettings: { ...(base.notificationSettings || {}), assignees: [{ id: personId, name: nameOf(personId) }], allMembersNotification: false } });
      } else payloads.push({ ...base, assigneeUserId: personId });
    } else if (fromBooking && !projectId && crew.length) {
      // Everyone, but the order doesn't exist yet: one task per booked person.
      crew.forEach((id) => payloads.push({ ...base, assigneeUserId: id }));
    } else if (projectId) {
      payloads.push({ ...base, projectId, ...(fromBooking ? { notificationSettings: { ...(base.notificationSettings || {}), assignees: [], allMembersNotification: true } } : {}) });
    } else payloads.push({ ...base, assigneeUserId: me });
    try {
      const ids = [];
      for (const payload of payloads) {
        const { data } = await apiClient.post('/tasks', payload);
        const id = data?._id || data?.id || data?.task?._id;
        if (id) ids.push(String(id));
      }
      appMessage.success(t('Task added'));
      if (fromBooking) {
        window.dispatchEvent(new CustomEvent('quicktask:added', { detail: { ids, title: text, due: dueAt.toISOString(), who: forWhom === 'one' && personId ? nameOf(personId) : t('Everyone in the order') } }));
      }
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
    <div className={`quick-task${fromBooking ? ' quick-task--booking' : ''}`}>
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
      {fromBooking ? null : (
      <div className="quick-task__chips">
        {dueChip ? (
          <span className="quick-task__chip"><CalendarOutlined /> {dueChip}</span>
        ) : null}
        <span className={`quick-task__chip quick-task__chip--${effectivePriority}`}>
          <FlagOutlined /> {t({ low: 'Low', normal: 'Normal', high: 'High' }[effectivePriority])}
        </span>
      </div>
      )}
      {fromBooking ? (
        <>
          <Segmented
            block
            value={forWhom}
            onChange={setForWhom}
            options={[{ value: 'all', label: t('Everyone in the order') }, { value: 'one', label: t('One person') }]}
          />
          {forWhom === 'one' ? (
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t('Choose person')}
              value={personId}
              onChange={setPersonId}
              options={people}
            />
          ) : null}
        </>
      ) : null}
      {fromBooking ? (
        <div className="quick-task__row">
          <DatePicker
           
            showTime={{ format: 'HH:mm', minuteStep: 15 }}
            format="YYYY-MM-DD HH:mm"
            value={due}
            onChange={setDue}
            placeholder={t('Deadline')}
            needConfirm={false}
            className="quick-task__due"
          />
          <Select
           
            className="quick-task__remind"
            value={remindEvery}
            onChange={setRemindEvery}
            options={[0, 15, 30, 60, 1440].map((v) => ({ value: v, label: t(v === 0 ? 'Off' : v === 15 ? 'Every 15 min' : v === 30 ? 'Every 30 min' : v === 60 ? 'Every hour' : 'Every day') }))}
            aria-label={t('Reminder')}
          />
        </div>
      ) : null}
      {(() => {
        const prio = (
          <Segmented
            block={!fromBooking}
            className="quick-task__prio"
            value={effectivePriority}
            onChange={setPriority}
            options={['low', 'normal', 'high'].map((v) => ({
              value: v,
              // From «Ny bokning» the flag lives in the switch itself — no extra chip row (owner 12.11).
              label: fromBooking
                ? <span className={`quick-task__prio-opt quick-task__prio-opt--${v}`}><FlagOutlined /> {t({ low: 'Low', normal: 'Normal', high: 'High' }[v])}</span>
                : t({ low: 'Low', normal: 'Normal', high: 'High' }[v]),
            }))}
          />
        );
        const add = (
          <Button type="primary" loading={saving} onClick={save}>
            {t('Add')}
          </Button>
        );
        // From «Ny bokning» the order is already known — no order picker; priority sits next to «Lägg till» (owner 12.11).
        if (fromBooking) return <div className="quick-task__row">{prio}{add}</div>;
        return (
          <>
            {prio}
            <div className="quick-task__row">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                className="quick-task__project"
                placeholder={t('Personal (no project)')}
                value={projectId}
                onChange={setProjectId}
                options={projectOptions}
              />
              {add}
            </div>
          </>
        );
      })()}
    </div>
  );

  return (
    <Popover
      content={content}
      title={fromBooking ? t('Task with auto reminders') : t('Quick task')}
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
