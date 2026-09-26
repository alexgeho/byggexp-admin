'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, ColorPicker, Dropdown, Input, InputNumber, Modal, Segmented, Select, Spin, Switch, Tabs, Tooltip, Upload,
} from 'antd';
import {
  ArrowLeftOutlined, CopyOutlined, DeleteOutlined, DesktopOutlined, DownloadOutlined, DownOutlined,
  HolderOutlined, MobileOutlined, PlusOutlined, SendOutlined, UploadOutlined,
} from '@ant-design/icons';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useAuthStore } from '@/src/store/authStore';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { newsletterApi } from './newsletterApi';
import { BLOCK_MAP, BLOCK_TYPES, createBlock, newBlockId } from './newsletterBlocks';
import './NewsletterEditorPage.scss';

const AUTOSAVE_MS = 1500;
const PREVIEW_MS = 350;

// ---------- field widgets ----------

function ImageField({ value, onChange }) {
  const t = useT();
  const [uploading, setUploading] = useState(false);

  const upload = async ({ file }) => {
    setUploading(true);
    try {
      onChange(await newsletterApi.uploadImage(file));
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not upload image'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="nl-image-field">
      {value ? <img src={value} alt="" className="nl-image-field__thumb" /> : null}
      <div className="nl-image-field__row">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" allowClear />
        <Upload accept="image/jpeg,image/png,image/gif,image/webp" showUploadList={false} customRequest={upload}>
          <Button icon={<UploadOutlined />} loading={uploading}>{t('Upload')}</Button>
        </Upload>
      </div>
      <div className="nl-hint">{t('Best: JPG or PNG, 1200px wide, under 300 KB.')}</div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const t = useT();
  switch (field.kind) {
    case 'textarea':
      return (
        <>
              <Input.TextArea value={value} onChange={(e) => onChange(e.target.value)} autoSize={{ minRows: 3, maxRows: 12 }} />
              {field.hint === 'formatHint' ? (
                <div className="nl-hint">{t('**bold**, *italic*, [link text](https://…), empty line = new paragraph')}</div>
              ) : null}
        </>
      );
    case 'select':
      return (
        <Select
          value={value}
          onChange={onChange}
          options={field.options.map((o) => ({ value: o.value, label: t(o.label) }))}
          style={{ width: '100%' }}
        />
      );
    case 'switch':
      return <Switch checked={Boolean(value)} onChange={onChange} />;
    case 'number':
      return <InputNumber value={value} onChange={onChange} min={field.min} max={field.max} style={{ width: 140 }} />;
    case 'image':
      return <ImageField value={value} onChange={onChange} />;
    case 'url':
      return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" allowClear />;
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Field({ label, children, inline = false }) {
  return (
    <label className={`nl-field${inline ? ' nl-field--inline' : ''}`}>
      <span className="nl-field__label">{label}</span>
      {children}
    </label>
  );
}

// ---------- blocks ----------

function SortableBlock({ block, open, onToggle, onChange, onDuplicate, onDelete, onAddAfter }) {
  const t = useT();
  const def = BLOCK_MAP[block.type];
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id });
  const summary = def?.summary?.(block) || '';

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`nl-block${open ? ' nl-block--open' : ''}${isDragging ? ' nl-block--dragging' : ''}`}
    >
      <div className="nl-block__head">
        <span className="nl-block__grip" {...attributes} {...listeners} title={t('Drag to reorder')}>
          <HolderOutlined />
        </span>
        <button type="button" className="nl-block__title" onClick={onToggle}>
          <span className="nl-block__type">{t(def?.label || block.type)}</span>
          <span className="nl-block__summary">{summary}</span>
          <DownOutlined className="nl-block__chevron" />
        </button>
        <Tooltip title={t('Duplicate')}>
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={onDuplicate} />
        </Tooltip>
        <Tooltip title={t('Delete')}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
        </Tooltip>
      </div>
      {open && def?.fields.length ? (
        <div className="nl-block__body">
          {def.fields.map((f) => (
            <Field key={f.key} label={t(f.label)} inline={f.kind === 'switch'}>
              <FieldInput field={f} value={block[f.key]} onChange={(v) => onChange({ ...block, [f.key]: v })} />
            </Field>
          ))}
        </div>
      ) : null}
      <AddBlockButton onAdd={onAddAfter} compact />
    </div>
  );
}

function AddBlockButton({ onAdd, compact = false }) {
  const t = useT();
  const items = BLOCK_TYPES.map((d) => ({ key: d.type, label: t(d.label) }));
  return (
    <div className={compact ? 'nl-add nl-add--compact' : 'nl-add'}>
      <Dropdown menu={{ items, onClick: ({ key }) => onAdd(key) }} trigger={['click']}>
        {compact ? (
          <button type="button" className="nl-add__dot" title={t('Add block here')}>
            <PlusOutlined />
          </button>
        ) : (
          <Button icon={<PlusOutlined />} block>{t('Add block')}</Button>
        )}
      </Dropdown>
    </div>
  );
}

// ---------- settings ----------

function SettingsPanel({ settings, onChange }) {
  const t = useT();
  const set = (key, value) => onChange({ ...settings, [key]: value });
  const nav = settings.navLinks || [];
  const setNav = (i, patch) => set('navLinks', nav.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const personal = settings.layout === 'personal';

  return (
    <div className="nl-settings">
      <Field label={t('Layout')}>
        <Segmented
          block
          value={personal ? 'personal' : 'newsletter'}
          onChange={(v) => set('layout', v)}
          options={[
            { value: 'newsletter', label: t('Newsletter (design)') },
            { value: 'personal', label: t('Personal letter') },
          ]}
        />
        <div className="nl-hint">
          {personal
            ? t('Plain left-aligned text without logo, menu or images — reads like a normal email. Good for outreach.')
            : t('Logo, menu, images and a full footer.')}
        </div>
      </Field>
      <Field label={t('Preview text (shown after the subject in the inbox)')}>
        <Input.TextArea value={settings.preheader} onChange={(e) => set('preheader', e.target.value)} autoSize={{ minRows: 2 }} maxLength={300} />
      </Field>
      <Field label={t('Campaign name for Google Analytics (utm_campaign)')}>
        <Input value={settings.utmCampaign} onChange={(e) => set('utmCampaign', e.target.value)} placeholder="nyhetsbrev-2026-10" />
      </Field>

      {personal ? null : (
        <>
      <h4 className="nl-settings__h">{t('Header')}</h4>
      <Field label={t('Logo')}>
        <ImageField value={settings.logoUrl} onChange={(v) => set('logoUrl', v)} />
      </Field>
      <div className="nl-settings__row">
        <Field label={t('Logo width (px)')}>
          <InputNumber value={settings.logoWidth} min={60} max={400} onChange={(v) => set('logoWidth', v)} />
        </Field>
        <Field label={t('Logo link')}>
          <Input value={settings.logoHref} onChange={(e) => set('logoHref', e.target.value)} />
        </Field>
      </div>
      <Field label={t('Menu links')}>
        <div className="nl-nav">
          {nav.map((l, i) => (
            <div className="nl-nav__row" key={i}>
              <Input value={l.label} onChange={(e) => setNav(i, { label: e.target.value })} placeholder={t('Text')} />
              <Input value={l.href} onChange={(e) => setNav(i, { href: e.target.value })} placeholder="https://…" />
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => set('navLinks', nav.filter((_, j) => j !== i))} />
            </div>
          ))}
          {nav.length < 5 ? (
            <Button size="small" icon={<PlusOutlined />} onClick={() => set('navLinks', [...nav, { label: '', href: '' }])}>
              {t('Add link')}
            </Button>
          ) : null}
        </div>
      </Field>

      <h4 className="nl-settings__h">{t('Colours')}</h4>
      <div className="nl-settings__row">
        <Field label={t('Text & headings')}>
          <ColorPicker value={settings.brandColor} onChange={(c) => set('brandColor', c.toHexString())} showText disabledAlpha />
        </Field>
        <Field label={t('Buttons & links')}>
          <ColorPicker value={settings.accentColor} onChange={(c) => set('accentColor', c.toHexString())} showText disabledAlpha />
        </Field>
      </div>

        </>
      )}

      <h4 className="nl-settings__h">{t('Footer')}</h4>
      {personal ? null : (
        <Field label={t('About us')}>
          <Input.TextArea value={settings.footerAbout} onChange={(e) => set('footerAbout', e.target.value)} autoSize={{ minRows: 2 }} />
        </Field>
      )}
      <div className="nl-settings__row">
        <Field label={t('Email')}>
          <Input value={settings.footerEmail} onChange={(e) => set('footerEmail', e.target.value)} />
        </Field>
        {personal ? null : (
          <Field label={t('Phone')}>
            <Input value={settings.footerPhone} onChange={(e) => set('footerPhone', e.target.value)} />
          </Field>
        )}
      </div>
      <Field label={t('Company address and org. no. (required in marketing emails)')}>
        <Input value={settings.footerAddress} onChange={(e) => set('footerAddress', e.target.value)} placeholder="ByggExp AB · Gatan 1 · 123 45 Stad · Org.nr 559xxx-xxxx" />
      </Field>
    </div>
  );
}

// ---------- page ----------

export default function NewsletterEditorPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const userEmail = useAuthStore((s) => s.user?.email || '');

  const [doc, setDoc] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error
  const [previewHtml, setPreviewHtml] = useState('');
  const [device, setDevice] = useState('desktop');
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [sending, setSending] = useState(false);
  const saveTimer = useRef(null);
  const docRef = useRef(null);
  docRef.current = doc;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    newsletterApi
      .get(id)
      .then((d) => setDoc({ title: d.title, subject: d.subject, settings: d.settings || {}, blocks: d.blocks || [] }))
      .catch(() => {
        appMessage.error(t('Newsletter not found'));
        navigate('/admin/newsletters');
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const current = docRef.current;
    if (!current) return;
    setSaveState('saving');
    try {
      await newsletterApi.update(id, current);
      // Only mark clean if nothing changed while the request was in flight.
      setSaveState(docRef.current === current ? 'saved' : 'dirty');
    } catch {
      setSaveState('error');
    }
  }, [id]);

  // Every edit goes through here: marks dirty and schedules an autosave.
  const update = useCallback((patch) => {
    setDoc((prev) => ({ ...prev, ...patch }));
    setSaveState('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), AUTOSAVE_MS);
  }, [save]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Live preview, debounced; rendered by the backend so it matches the sent mail.
  useEffect(() => {
    if (!doc) return undefined;
    const timer = setTimeout(() => {
      newsletterApi.preview(doc).then((r) => setPreviewHtml(r.html)).catch(() => {});
    }, PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [doc]);

  // Ctrl/Cmd+S saves now; warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    const onUnload = (e) => {
      if (saveState === 'dirty' || saveState === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [save, saveState]);

  const blocks = doc?.blocks || [];
  const setBlocks = (next) => update({ blocks: next });

  const insertBlock = (type, index) => {
    const block = createBlock(type);
    const next = [...blocks];
    next.splice(index, 0, block);
    setBlocks(next);
    setOpenId(block.id);
  };

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, from, to));
  };

  const saveThen = async (fn) => {
    if (saveState !== 'saved') await save();
    return fn();
  };

  const downloadHtml = () => saveThen(async () => {
    const { html } = await newsletterApi.html(id);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(doc.title || 'nyhetsbrev').replace(/[^\wåäöÅÄÖ-]+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const copyHtml = () => saveThen(async () => {
    const { html } = await newsletterApi.html(id);
    await navigator.clipboard.writeText(html);
    appMessage.success(t('HTML copied'));
  });

  const sendTest = async () => {
    setSending(true);
    try {
      await saveThen(async () => {
        const r = await newsletterApi.sendTest(id, testTo.trim() || undefined);
        appMessage.success(t('Test email sent to {x}').replace('{x}', r.to));
        setTestOpen(false);
      });
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not send test email'));
    } finally {
      setSending(false);
    }
  };

  const saveLabel = useMemo(() => ({
    saved: t('Saved'),
    dirty: t('Unsaved changes'),
    saving: t('Saving…'),
    error: t('Could not save'),
  })[saveState], [saveState, t]);

  if (!doc) {
    return <div className="nl-editor__spin"><Spin /></div>;
  }

  return (
    <div className="nl-editor">
      <div className="nl-editor__bar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/newsletters')} />
        <Input
          className="nl-editor__title"
          value={doc.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={t('Internal name')}
        />
        <span className={`nl-editor__state nl-editor__state--${saveState}`}>{saveLabel}</span>
        <div className="nl-editor__actions">
          <Button icon={<CopyOutlined />} onClick={copyHtml}>{t('Copy HTML')}</Button>
          <Button icon={<DownloadOutlined />} onClick={downloadHtml}>{t('Download HTML')}</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => { setTestTo(userEmail); setTestOpen(true); }}>
            {t('Send test')}
          </Button>
        </div>
      </div>

      <div className="nl-editor__grid">
        <div className="nl-editor__panel">
          <Field label={t('Subject line')}>
            <Input value={doc.subject} onChange={(e) => update({ subject: e.target.value })} maxLength={300} showCount />
          </Field>
          <Tabs
            items={[
              {
                key: 'content',
                label: t('Content'),
                children: (
                  <div className="nl-blocks">
                    <AddBlockButton onAdd={(type) => insertBlock(type, 0)} compact />
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                        {blocks.map((b, i) => (
                          <SortableBlock
                            key={b.id}
                            block={b}
                            open={openId === b.id}
                            onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                            onChange={(nb) => setBlocks(blocks.map((x) => (x.id === b.id ? nb : x)))}
                            onDuplicate={() => {
                              const copy = { ...structuredClone(b), id: newBlockId() };
                              const next = [...blocks];
                              next.splice(i + 1, 0, copy);
                              setBlocks(next);
                              setOpenId(copy.id);
                            }}
                            onDelete={() => setBlocks(blocks.filter((x) => x.id !== b.id))}
                            onAddAfter={(type) => insertBlock(type, i + 1)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <AddBlockButton onAdd={(type) => insertBlock(type, blocks.length)} />
                  </div>
                ),
              },
              {
                key: 'settings',
                label: t('Design & footer'),
                children: <SettingsPanel settings={doc.settings} onChange={(s) => update({ settings: s })} />,
              },
            ]}
          />
        </div>

        <div className="nl-editor__preview">
          <div className="nl-editor__preview-bar">
            <Segmented
              value={device}
              onChange={setDevice}
              options={[
                { value: 'desktop', icon: <DesktopOutlined />, label: t('Desktop') },
                { value: 'mobile', icon: <MobileOutlined />, label: t('Mobile') },
              ]}
            />
            <span className="nl-hint">{t('Preview — exactly what recipients get')}</span>
          </div>
          <div className="nl-editor__frame-wrap">
            <div className="nl-editor__inbox">
              <strong>{doc.subject || t('(no subject)')}</strong>
              <span>{doc.settings?.preheader}</span>
            </div>
            <iframe
              title={t('Preview')}
              className={`nl-editor__frame nl-editor__frame--${device}`}
              srcDoc={previewHtml}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      </div>

      <Modal
        open={testOpen}
        title={t('Send test email')}
        okText={t('Send')}
        cancelText={t('Cancel')}
        confirmLoading={sending}
        onOk={sendTest}
        onCancel={() => setTestOpen(false)}
      >
        <Field label={t('Recipient')}>
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} onPressEnter={sendTest} type="email" />
        </Field>
        <div className="nl-hint">{t('The subject gets a [TEST] prefix. Check it in Gmail and Outlook before sending to customers.')}</div>
      </Modal>
    </div>
  );
}
