'use client';

import { useEffect, useState } from 'react';
import { DatePicker, Form, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';

// Admin manual-hours entry. Mirrors the app's "Manual (worker)" hours source:
// an admin logs the hours a worker actually worked on a day/project when there
// was no clock-in. Posts to /shifts/manual, which sets Manual hours on that
// day's shift or creates a completed manual-only shift.
export default function ManualHoursModal({ open, onClose, onSaved }) {
  const t = useT();
  const [form] = Form.useForm();
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiClient.get('/users')
      .then((r) => setWorkers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setWorkers([]));
    apiClient.get('/projects')
      .then((r) => setProjects(Array.isArray(r.data) ? r.data : []))
      .catch(() => setProjects([]));
  }, [open]);

  const submit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const durationMs = ((Number(values.hours) || 0) * 60 + (Number(values.minutes) || 0)) * 60000;
    if (durationMs <= 0) {
      message.error(t('Enter the hours worked'));
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/shifts/manual', {
        workerId: values.workerId,
        projectId: values.projectId,
        date: values.date.format('YYYY-MM-DD'),
        durationMs,
      });
      message.success(t('Manual hours saved'));
      form.resetFields();
      onSaved?.();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.message || t('Could not save manual hours'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      title={t('Add manual hours')}
      okText={t('Save')}
      cancelText={t('Cancel')}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ date: dayjs(), hours: 8, minutes: 0 }}>
        <Form.Item name="workerId" label={t('Worker')} rules={[{ required: true, message: t('Select worker') }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('Select worker')}
            options={workers.map((w) => ({ value: getEntityId(w), label: w.name || w.email }))}
          />
        </Form.Item>
        <Form.Item name="projectId" label={t('Project')} rules={[{ required: true, message: t('Select project') }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('Select project')}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </Form.Item>
        <Form.Item name="date" label={t('Date')} rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="hours" label={t('Hours')} style={{ flex: 1 }}>
            <InputNumber min={0} max={24} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minutes" label={t('Minutes')} style={{ flex: 1 }}>
            <InputNumber min={0} max={59} style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
