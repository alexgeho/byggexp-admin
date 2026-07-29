'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Popover, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useAuthStore } from '@/src/store/authStore';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import './QuickTask.scss';

// Frictionless task capture: a floating "+" (and Cmd/Ctrl+K) opens a single
// field — type, Enter, done. Defaults to a personal task; a project is
// optional. Stays open so several ideas can be fired off in a row.
export default function QuickTask() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(undefined);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Global shortcut: Cmd/Ctrl+K opens the quick capture.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const save = async () => {
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    const now = new Date();
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const base = {
      taskTitle: text,
      status: 'open',
      startDate: now.toISOString(),
      dueDate: due.toISOString(),
    };
    const payload = projectId
      ? { ...base, projectId }
      : { ...base, assigneeUserId: user?.id || user?._id || user?.userId };
    try {
      await apiClient.post('/tasks', payload);
      appMessage.success(t('Task added'));
      setTitle('');
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
      <div className="quick-task__hint">{t('Enter to add · ⌘K to open')}</div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={t('Quick task')}
      trigger="click"
      placement="topRight"
      open={open}
      onOpenChange={setOpen}
    >
      <button type="button" className="quick-task__fab" aria-label={t('Quick task')}>
        <PlusOutlined />
      </button>
    </Popover>
  );
}
