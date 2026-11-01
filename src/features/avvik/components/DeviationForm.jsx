import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Select, Upload } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useDeviationStore } from '@/src/store/deviationStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import {
  DEVIATION_CATEGORIES,
  DEVIATION_SEVERITIES,
  dayValue,
  deviationCategoryLabel,
  deviationSeverityLabel,
} from '@/src/features/avvik/deviationMeta';

// Report a new deviation or edit one. `prefill` comes from a checklist remark
// or a dagbok entry ({ projectId, title, description, category, source }).
export default function DeviationForm({
  deviation = null,
  prefill = null,
  fixedProjectId = null,
  onSaved,
  onCanSaveChange,
}) {
  const [form] = Form.useForm();
  const { t, lang } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const create = useDeviationStore((s) => s.createDeviation);
  const update = useDeviationStore((s) => s.updateDeviation);
  const addPhotos = useDeviationStore((s) => s.addPhotos);
  const loadResponsible = useDeviationStore((s) => s.responsibleOptions);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [files, setFiles] = useState([]);
  const editing = Boolean(deviation);
  const lockedProject = fixedProjectId || prefill?.projectId || deviation?.projectId || null;
  // Admin panel users manage (company/project admins); the backend still checks.
  const editable = deviation?.editableFields;
  const canEdit = (field) => !editing || !editable || editable.includes(field);

  useEffect(() => {
    if (lockedProject) return;
    const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
    apiClient.get(url).then(({ data }) => setProjects(data || [])).catch(() => setProjects([]));
  }, [user?.role, lockedProject]);

  useEffect(() => {
    form.setFieldsValue(deviation ? {
      projectId: deviation.projectId,
      title: deviation.title,
      description: deviation.description,
      category: deviation.category,
      severity: deviation.severity,
      location: deviation.location,
      responsibleUserId: deviation.responsibleUserId || undefined,
      dueDate: dayValue(deviation.dueDate),
      cause: deviation.cause,
      correctiveAction: deviation.correctiveAction,
    } : {
      projectId: lockedProject || undefined,
      title: prefill?.title || '',
      description: prefill?.description || '',
      category: prefill?.category || 'hms',
      severity: prefill?.severity || 'medium',
      location: prefill?.location || '',
      correctiveAction: prefill?.correctiveAction || '',
    });
  }, [form, deviation, prefill, lockedProject]);

  const projectId = Form.useWatch('projectId', form) || lockedProject;
  useEffect(() => {
    let alive = true;
    loadResponsible(projectId).then((rows) => { if (alive) setPeople(rows); });
    return () => { alive = false; };
  }, [projectId, loadResponsible]);

  const title = Form.useWatch('title', form);
  const canSave = Boolean((title || '').trim()) && Boolean(projectId);
  useEffect(() => { onCanSaveChange?.(canSave); }, [canSave, onCanSaveChange]);

  const categoryOptions = useMemo(
    () => DEVIATION_CATEGORIES.map((c) => ({ value: c, label: deviationCategoryLabel(c, lang) })),
    [lang],
  );
  const severityOptions = useMemo(
    () => DEVIATION_SEVERITIES.map((s) => ({ value: s, label: deviationSeverityLabel(s, lang) })),
    [lang],
  );

  const onFinish = async (values) => {
    const payload = {
      title: (values.title || '').trim(),
      description: values.description || '',
      category: values.category,
      severity: values.severity,
      location: values.location || '',
      responsibleUserId: values.responsibleUserId || null,
      dueDate: values.dueDate || null,
      ...(editing ? { cause: values.cause || '', correctiveAction: values.correctiveAction || '' } : {}),
    };
    let saved;
    if (editing) {
      const allowed = Object.fromEntries(Object.entries(payload).filter(([k]) => canEdit(k)));
      saved = await update(getEntityId(deviation), allowed);
    } else {
      saved = await create({
        ...payload,
        projectId: values.projectId || lockedProject,
        ...(prefill?.correctiveAction ? { correctiveAction: values.correctiveAction || '' } : {}),
        ...(prefill?.source ? { source: prefill.source } : {}),
      });
    }
    if (files.length) saved = await addPhotos(getEntityId(saved), files);
    onSaved?.(saved);
  };

  return (
    <Form id="deviation-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      {lockedProject ? null : (
        <Form.Item name="projectId" label={t('Project')} rules={[{ required: true, message: t('Select a project') }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('Select a project')}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </Form.Item>
      )}
      <Form.Item name="title" label={t('Title')} rules={[{ required: true, message: t('Title') }]}>
        <Input disabled={!canEdit('title')} />
      </Form.Item>
      <div className="invoice-form__grid">
        <Form.Item name="category" label={t('Category')}>
          <Select options={categoryOptions} disabled={!canEdit('category')} />
        </Form.Item>
        <Form.Item name="severity" label={t('Severity')}>
          <Select options={severityOptions} disabled={!canEdit('severity')} />
        </Form.Item>
        <Form.Item name="responsibleUserId" label={t('Responsible')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!canEdit('responsibleUserId')}
            options={people.map((p) => ({ value: p._id, label: p.name }))}
          />
        </Form.Item>
        <Form.Item name="dueDate" label={t('Due by')}>
          <Input type="date" disabled={!canEdit('dueDate')} />
        </Form.Item>
      </div>
      <Form.Item name="location" label={t('Location')}>
        <Input disabled={!canEdit('location')} />
      </Form.Item>
      <Form.Item name="description" label={t('Description')}>
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} disabled={!canEdit('description')} />
      </Form.Item>
      {editing || prefill?.correctiveAction ? (
        <>
          {editing ? (
            <Form.Item name="cause" label={t('Cause')}>
              <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} disabled={!canEdit('cause')} />
            </Form.Item>
          ) : null}
          <Form.Item name="correctiveAction" label={t('Corrective action')}>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} disabled={!canEdit('correctiveAction')} />
          </Form.Item>
        </>
      ) : null}
      <Upload
        accept="image/*,.heic,.heif"
        multiple
        listType="picture"
        fileList={files.map((f) => ({ uid: f.uid, name: f.name, status: 'done', originFileObj: f }))}
        beforeUpload={(file) => { setFiles((prev) => [...prev, file]); return false; }}
        onRemove={(file) => setFiles((prev) => prev.filter((f) => f.uid !== file.uid))}
      >
        <Button icon={<CameraOutlined />}>{t('Add photos')}</Button>
      </Upload>
    </Form>
  );
}
