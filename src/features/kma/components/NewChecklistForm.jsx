import { useEffect, useState } from 'react';
import { Button, Form, Input, Select, Spin, Upload } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useChecklistStore } from '@/src/store/checklistStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { useModuleStore, isEgenkontrollOnly } from '@/src/store/moduleStore';
import '@/src/features/kma/kma.scss';

const today = () => new Date().toISOString().slice(0, 10);

// Start a new egenkontroll on a project: from a template, blank, or — with AI —
// from a contract / arbetsbeskrivning (points are drafted and editable here).
export default function NewChecklistForm({ onClose, onCreated, onCanSaveChange, defaultProjectId = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  const [reading, setReading] = useState(false);
  const [draft, setDraft] = useState(null); // { items, sourceDocument, category }
  const templates = useChecklistStore((s) => s.templates);
  const fetchTemplates = useChecklistStore((s) => s.fetchTemplates);
  const create = useChecklistStore((s) => s.createChecklist);
  const aiEnabled = useChecklistStore((s) => s.aiEnabled);
  const aiChecked = useChecklistStore((s) => s.aiChecked);
  const fetchAiStatus = useChecklistStore((s) => s.fetchAiStatus);
  const draftFromDocument = useChecklistStore((s) => s.draftFromDocument);
  const user = useAuthStore((s) => s.user);
  // Solo Egenkontroll plan: no projects UI — the site address is typed here and
  // a project is created behind the scenes.
  const solo = isEgenkontrollOnly(useModuleStore((s) => s.plan), useModuleStore((s) => s.enabled));
  // Solo without AI: say so where the upload zone is and let points be typed.
  const aiOff = solo && aiChecked && !aiEnabled;
  const [readFailed, setReadFailed] = useState(false);
  // Points list: after a contract read, a failed read or with AI off (solo).
  const points = draft || ((readFailed || aiOff) ? {} : null);

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
    void fetchAiStatus();
  }, [user?.role, fetchTemplates, fetchAiStatus, templates.length]);

  useEffect(() => {
    form.setFieldsValue({ date: today(), projectId: defaultProjectId || undefined });
  }, [form, defaultProjectId]);

  // Save is active only with something to save: ≥1 non-empty point (drafted
  // from the contract, or a template's points) — and the address in solo.
  const watchedItems = Form.useWatch('draftItems', form);
  const watchedTemplate = Form.useWatch('templateId', form);
  const watchedSite = Form.useWatch('site', form);
  const canSave = (points
    ? (watchedItems || []).some((it) => it?.text?.trim())
    : !!watchedTemplate)
    && (!solo || !!(watchedSite || '').trim())
    && !reading;
  useEffect(() => { onCanSaveChange?.(canSave); }, [canSave, onCanSaveChange]);

  const readDocument = async (file) => {
    setReading(true);
    setReadFailed(false);
    try {
      const data = await draftFromDocument(file);
      setDraft({ category: data.category, trade: data.trade, tradeInfo: data.tradeInfo, sourceDocument: data.sourceDocument });
      form.setFieldsValue({
        title: form.getFieldValue('title') || data.title,
        templateId: undefined,
        draftItems: data.items || [],
      });
    } catch {
      setReadFailed(true); // store shows the error toast
    }
    setReading(false);
    return false;
  };

  const onFinish = async (values) => {
    let projectId = values.projectId;
    if (solo) {
      const site = (values.site || '').trim();
      const { data: project } = await apiClient.post('/projects', { name: site || values.title || t('Egenkontroll'), location: site });
      projectId = getEntityId(project);
    }
    const items = points
      ? (values.draftItems || []).filter((it) => it?.text?.trim()).map((it) => ({
        text: it.text.trim(),
        reference: (it.reference || '').trim(),
        method: it.method || '',
        unit: it.unit || '',
      }))
      : undefined;
    const created = await create({
      projectId,
      templateId: points ? undefined : values.templateId || undefined,
      title: values.title || undefined,
      date: values.date || today(),
      responsible: values.responsible || undefined,
      ...(points ? { items } : {}),
      ...(draft ? { category: draft.category, trade: draft.trade || '', tradeInfo: draft.tradeInfo || null, sourceDocument: draft.sourceDocument || undefined } : {}),
    });
    onClose?.();
    onCreated?.(created);
  };

  return (
    <Form id="new-checklist-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      {(aiEnabled || solo) && !draft ? (
        <Upload.Dragger
          accept=".pdf,image/*,.heic,.heif,.txt"
          showUploadList={false}
          beforeUpload={readDocument}
          disabled={reading || aiOff}
          style={{ marginBottom: 16 }}
        >
          {aiOff ? (
            // Solo without AI: the zone stays, with the reason inside it.
            <div style={{ padding: 4 }}>
              <p style={{ fontSize: 24, margin: 0, color: 'var(--ant-color-error, #ff4d4f)' }}><ExclamationCircleOutlined /></p>
              <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--ant-color-error, #ff4d4f)' }}>
                {t('AI reading is unavailable right now — add the points yourself.')}
              </p>
            </div>
          ) : reading ? (
            <div style={{ padding: 8 }}>
              <Spin />
              <p style={{ margin: '8px 0 0' }}>{t('Reading the document and creating control points…')}</p>
            </div>
          ) : (
            <div style={{ padding: 4 }}>
              <p style={{ fontSize: 24, margin: 0 }}><FileTextOutlined /></p>
              <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{t('Create from contract or work description')}</p>
            </div>
          )}
        </Upload.Dragger>
      ) : null}

      <div className="invoice-form__grid">
        {solo ? (
          <Form.Item name="site" label={t('Address')} rules={[{ required: true, message: t('Enter an address') }]}>
            <Input placeholder={t('e.g. Storgatan 5, Uppsala')} />
          </Form.Item>
        ) : (
        <Form.Item name="projectId" label={t('Project')} rules={[{ required: true, message: t('Select a project') }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('Select a project')}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </Form.Item>
        )}
        {points || solo ? null : (
          <Form.Item name="templateId" label={t('Template')}>
            <Select
              allowClear
              placeholder={t('Blank checklist')}
              options={templates.map((tpl) => ({ value: getEntityId(tpl), label: tpl.name }))}
            />
          </Form.Item>
        )}
        {solo ? null : (
          <>
            <Form.Item name="date" label={t('Date')}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="responsible" label={t('Responsible')}>
              <Input placeholder={t('Name')} />
            </Form.Item>
          </>
        )}
      </div>
      <Form.Item name="title" label={t('Title')} extra={points || solo ? null : t('Optional — defaults to the template name')}>
        <Input placeholder={t('e.g. Self-inspection, electrical – floor 2')} />
      </Form.Item>

      {points ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
            <strong>{t('Control points')}</strong>
            {draft?.sourceDocument?.name ? (
              <span className="kma-muted" style={{ fontSize: 12 }}>
                <FileTextOutlined /> {draft.sourceDocument.name}
              </span>
            ) : null}
          </div>
          <Form.List name="draftItems">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span className="kma-faint" style={{ paddingTop: 6, minWidth: 20 }}>{index + 1}.</span>
                    <Form.Item name={[field.name, 'text']} style={{ flex: 2, marginBottom: 0 }}>
                      <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder={t('Control point')} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'reference']} style={{ flex: 1, marginBottom: 0 }}>
                      <Input placeholder={t('Requirement / reference')} />
                    </Form.Item>
                    <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label={t('Delete')} />
                  </div>
                ))}
                <Button type="primary" icon={<PlusOutlined />} onClick={() => add({ text: '', reference: '' })}>
                  {t('Add point')}
                </Button>
              </div>
            )}
          </Form.List>
        </>
      ) : null}
    </Form>
  );
}
