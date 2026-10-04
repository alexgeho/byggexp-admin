import { useEffect, useState } from 'react';
import { Button, Form, Image, Input, Radio, Spin, Tag, Upload } from 'antd';
import { CameraOutlined, CheckOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import { useChecklistStore } from '@/src/store/checklistStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { KMA_RESULT_META } from '@/src/features/kma/categories';
import '@/src/features/kma/kma.scss';

const RESULT_CHOICES = ['ok', 'remark', 'na'];

const toFormValues = (checklist) => ({
  title: checklist?.title || '',
  date: checklist?.date || '',
  responsible: checklist?.responsible || '',
  notes: checklist?.notes || '',
  items: (checklist?.items || []).map((it) => ({
    text: it.text,
    reference: it.reference,
    result: it.result || 'pending',
    comment: it.comment || '',
    date: it.date || '',
  })),
});

// Fill in / view a single egenkontroll. A signed checklist is read-only.
// Site photos can be dropped in; the AI fills the matching points in straight
// away ("AI" tag + Ångra per point, as in the app).
export default function ChecklistFillForm({ onClose, checklist: initial }) {
  const [form] = Form.useForm();
  const { t, lang } = useLanguage();
  const update = useChecklistStore((s) => s.updateChecklist);
  const addPhotos = useChecklistStore((s) => s.addPhotos);
  const decideSuggestion = useChecklistStore((s) => s.decideSuggestion);
  const aiEnabled = useChecklistStore((s) => s.aiEnabled);
  const fetchAiStatus = useChecklistStore((s) => s.fetchAiStatus);
  const [checklist, setChecklist] = useState(initial);
  const [busy, setBusy] = useState(false);
  const readOnly = checklist?.status === 'signed';
  const id = getEntityId(checklist);

  useEffect(() => { void fetchAiStatus(); }, [fetchAiStatus]);
  useEffect(() => { form.setFieldsValue(toFormValues(checklist)); }, [form, checklist]);

  // Server item (photos, AI suggestion, metod/mätvärde/vem/åtgärd set in the
  // app) + form edits on top → PUT body, so admin saves never wipe app fields.
  const payload = (values) => ({
    ...values,
    items: (values.items || []).map((v, i) => {
      const server = checklist?.items?.[i] || {};
      return {
        ...server,
        ...v,
        photoUrls: server.photoUrls || [],
        suggestion: server.suggestion || null,
      };
    }),
  });

  // Save unsaved edits first so a server-side change doesn't wipe them.
  const saveThen = async (action) => {
    setBusy(true);
    try {
      await update(id, payload(form.getFieldsValue(true)));
      const next = await action();
      if (next) setChecklist(next);
    } catch { /* store surfaces errors */ }
    setBusy(false);
  };

  const onPhotos = (file, fileList) => {
    // beforeUpload fires once per file; act on the last one with the whole batch.
    if (file === fileList[fileList.length - 1]) {
      void saveThen(() => addPhotos(id, fileList));
    }
    return false;
  };

  const onFinish = async (values) => {
    // A signed checklist is locked — never mutate it; the footer just closes.
    if (readOnly) { onClose?.(); return; }
    await update(id, payload(values));
    onClose?.();
  };

  const resultLabel = (r) => KMA_RESULT_META[r]?.[lang] ?? KMA_RESULT_META[r]?.en ?? r;
  const photos = checklist?.photos || [];

  return (
    <Form id="checklist-fill-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish} disabled={readOnly}>
      <div className="invoice-form__grid">
        <Form.Item name="title" label={t('Title')} rules={[{ required: true, message: t('Enter a title') }]}>
          <Input />
        </Form.Item>
        <Form.Item name="date" label={t('Date')}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="responsible" label={t('Responsible')}>
          <Input placeholder={t('Name')} />
        </Form.Item>
      </div>

      {checklist?.sourceDocument?.url ? (
        <p style={{ margin: '0 0 12px', fontSize: 13 }}>
          <FileTextOutlined />{' '}
          <a href={resolveUrl(checklist.sourceDocument.url)} target="_blank" rel="noreferrer">
            {checklist.sourceDocument.name || t('Contract')}
          </a>
        </p>
      ) : null}

      {!readOnly ? (
        <Upload.Dragger
          multiple
          accept="image/*,.heic,.heif"
          showUploadList={false}
          beforeUpload={onPhotos}
          disabled={busy}
          style={{ marginBottom: 12 }}
        >
          {busy ? (
            <div style={{ padding: 4 }}>
              <Spin />
              <p style={{ margin: '8px 0 0' }}>
                {aiEnabled ? t('Uploading and analysing photos…') : t('Uploading photos…')}
              </p>
            </div>
          ) : (
            <div style={{ padding: 2 }}>
              <p style={{ fontSize: 22, margin: 0 }}><CameraOutlined /></p>
              <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{t('Add photos from the site')}</p>
            </div>
          )}
        </Upload.Dragger>
      ) : null}

      {photos.length ? (
        <Image.PreviewGroup>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {photos.map((p) => (
              <Image key={p.url} src={resolveUrl(p.url)} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 6 }} />
            ))}
          </div>
        </Image.PreviewGroup>
      ) : null}

      <Form.List name="items">
        {(fields) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {fields.map((field, index) => {
              const item = checklist?.items?.[index] || {};
              const s = item.suggestion;
              return (
                <div key={field.key} className="kma-item">
                  <div style={{ marginBottom: 8 }}>
                    <span className="kma-faint" style={{ marginRight: 6 }}>{index + 1}.</span>
                    <strong>{item.text || '—'}</strong>
                    {item.reference ? (
                      <div className="kma-faint" style={{ fontSize: 12, marginTop: 2 }}>{item.reference}</div>
                    ) : null}
                  </div>

                  {s && s.state === 'pending' && !readOnly ? (
                    <div className="kma-suggestion">
                      {s.photoUrl ? (
                        <Image src={resolveUrl(s.photoUrl)} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
                      ) : null}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>
                          <strong>{t('AI suggestion')}:</strong> {resultLabel(s.result)}
                          {s.date ? ` · ${s.date}` : ''}
                        </div>
                        {s.reason ? <div className="kma-suggestion__reason">{s.reason}</div> : null}
                      </div>
                      <Button size="small" type="primary" icon={<CheckOutlined />} disabled={busy}
                        onClick={() => saveThen(() => decideSuggestion(id, index, true))}>
                        {t('Approve')}
                      </Button>
                      <Button size="small" type="primary" icon={<CloseOutlined />} disabled={busy}
                        onClick={() => saveThen(() => decideSuggestion(id, index, false))}>
                        {t('Reject')}
                      </Button>
                    </div>
                  ) : null}

                  {s && s.state === 'auto' && !readOnly ? (
                    <div className="kma-ai-note">
                      <span className="kma-ai-note__tag">AI</span>
                      <Button size="small" type="link" disabled={busy} style={{ padding: 0 }}
                        onClick={() => saveThen(() => decideSuggestion(id, index, false))}>
                        {t('Undo')}
                      </Button>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Form.Item name={[field.name, 'result']} style={{ marginBottom: 8 }}>
                      <Radio.Group optionType="button" buttonStyle="solid">
                        {RESULT_CHOICES.map((r) => (
                          <Radio.Button key={r} value={r}>{resultLabel(r)}</Radio.Button>
                        ))}
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item name={[field.name, 'date']} style={{ marginBottom: 8 }}>
                      <Input type="date" style={{ width: 150 }} />
                    </Form.Item>
                  </div>
                  <Form.Item name={[field.name, 'comment']} style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={1} placeholder={t('Comment')} />
                  </Form.Item>
                  {item.photoUrls?.length ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {item.photoUrls.map((u) => (
                        <Image key={u} src={resolveUrl(u)} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
                      ))}
                    </div>
                  ) : null}
                  {/* Keep hidden fields so text/reference round-trip on save. */}
                  <Form.Item name={[field.name, 'text']} hidden><Input /></Form.Item>
                  <Form.Item name={[field.name, 'reference']} hidden><Input /></Form.Item>
                </div>
              );
            })}
          </div>
        )}
      </Form.List>

      <Form.Item name="notes" label={t('Notes')} style={{ marginTop: 12 }}>
        <Input.TextArea rows={2} />
      </Form.Item>

      {readOnly ? (
        <Tag color="success">{t('Signed — locked')}</Tag>
      ) : null}
    </Form>
  );
}
