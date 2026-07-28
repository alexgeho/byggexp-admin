import { useEffect, useState } from 'react';
import { Form, Input, Select } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useChecklistStore } from '@/src/store/checklistStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

const today = () => new Date().toISOString().slice(0, 10);

// Start a new egenkontroll from a template (or blank) on a project.
export default function NewChecklistForm({ onClose, onCreated, defaultProjectId = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  const templates = useChecklistStore((s) => s.templates);
  const fetchTemplates = useChecklistStore((s) => s.fetchTemplates);
  const create = useChecklistStore((s) => s.createChecklist);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      try {
        const { data } = await apiClient.get(url);
        setProjects(data || []);
      } catch {
        setProjects([]);
      }
    };
    load();
    if (!templates.length) void fetchTemplates();
  }, [user?.role, fetchTemplates, templates.length]);

  useEffect(() => {
    form.setFieldsValue({ date: today(), projectId: defaultProjectId || undefined });
  }, [form, defaultProjectId]);

  const onFinish = async (values) => {
    const created = await create({
      projectId: values.projectId,
      templateId: values.templateId || undefined,
      title: values.title || undefined,
      date: values.date || undefined,
      responsible: values.responsible || undefined,
    });
    onClose?.();
    onCreated?.(created);
  };

  return (
    <Form id="new-checklist-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div className="invoice-form__grid">
        <Form.Item name="projectId" label={t('Project')} rules={[{ required: true, message: t('Select a project') }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('Select a project')}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </Form.Item>
        <Form.Item name="templateId" label={t('Template')}>
          <Select
            allowClear
            placeholder={t('Blank checklist')}
            options={templates.map((tpl) => ({ value: getEntityId(tpl), label: tpl.name }))}
          />
        </Form.Item>
        <Form.Item name="date" label={t('Date')}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="responsible" label={t('Responsible')}>
          <Input placeholder={t('Name')} />
        </Form.Item>
      </div>
      <Form.Item name="title" label={t('Title')} extra={t('Optional — defaults to the template name')}>
        <Input placeholder={t('e.g. Egenkontroll el – vån 2')} />
      </Form.Item>
    </Form>
  );
}
