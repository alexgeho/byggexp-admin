'use client';

import { useEffect, useState } from 'react';
import {
  Button, Drawer, Form, Input, Select,
} from 'antd';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';

// Payroll systems the export targets. All of them import PAXml; CSV is the
// fallback for a system that only takes a spreadsheet.
export const PAYROLL_SYSTEMS = [
  { value: 'fortnox', label: 'Fortnox Lön' },
  { value: 'visma', label: 'Visma Lön' },
  { value: 'hogia', label: 'Hogia Lön' },
  { value: 'crona', label: 'Crona Lön' },
  { value: 'other', label: 'Other payroll system' },
];

export const systemLabel = (value, t) => {
  const system = PAYROLL_SYSTEMS.find((s) => s.value === value);
  return system ? t(system.label) : t('payroll system');
};

// Lönesystem, file format, löneart per item and frånvarokoder.
export default function PayrollSettingsDrawer({
  open, settings, onClose, onSaved,
}) {
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;
    form.setFieldsValue({
      payrollSystem: settings.payrollSystem,
      exportFormat: settings.exportFormat,
      salaryCodes: settings.salaryCodes,
      absenceCodes: settings.absenceCodes,
    });
  }, [open, settings, form]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await apiClient.put('/payroll-basis/settings', values);
      appMessage.success(t('Payroll settings saved'));
      onSaved?.(res.data);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={t('Payroll system & codes')}
      open={open}
      width={560}
      onClose={onClose}
      destroyOnHidden
      extra={<Button type="primary" onClick={save} loading={saving}>{t('Save')}</Button>}
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }}>
        <Form.Item name="payrollSystem" label={t('Payroll system')}>
          <Select options={PAYROLL_SYSTEMS.map((s) => ({ value: s.value, label: t(s.label) }))} />
        </Form.Item>
        <Form.Item
          name="exportFormat"
          label={t('File format')}
          extra={t('PAXml is imported by most Swedish payroll systems. Choose CSV if yours only takes a spreadsheet.')}
        >
          <Select
            options={[
              { value: 'paxml', label: 'PAXml' },
              { value: 'csv', label: t('CSV (Excel)') },
            ]}
          />
        </Form.Item>
        <h4>{t('Lönearter')}</h4>
        <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
          {t('Enter the löneart number each item has in your payroll system. Items without a number are not exported.')}
        </p>
        {Object.entries(settings?.salaryItems || {}).map(([code, label]) => (
          <Form.Item key={code} name={['salaryCodes', code]} label={label} style={{ marginBottom: 8 }}>
            <Input placeholder={t('Löneart')} />
          </Form.Item>
        ))}
        <h4>{t('Absence codes')}</h4>
        {Object.entries(settings?.absenceItems || {}).map(([code, label]) => (
          <Form.Item key={code} name={['absenceCodes', code]} label={label} style={{ marginBottom: 8 }}>
            <Input placeholder="SJK" />
          </Form.Item>
        ))}
      </Form>
    </Drawer>
  );
}
