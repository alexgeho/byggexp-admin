import { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, InputNumber, TimePicker } from 'antd';
import { CloseOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { Button, Input, Segmented, Select } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';

const asTime = (hhmm) => dayjs(`2000-01-01T${hhmm}`);
const COLLAPSE_KEY = 'order-modal-collapsed';

// One collapsible block of the order window (header click folds it).
function Section({ id, title, extra, collapsed, onToggle, children }) {
  const open = !collapsed.includes(id);
  return (
    <section className={`order-sec${open ? ' is-open' : ''}`}>
      <div className="order-sec__head">
        <button type="button" className="order-sec__toggle" onClick={() => onToggle(id)} aria-expanded={open}>
          <DownOutlined className="order-sec__chev" />
          <span>{title}</span>
        </button>
        {extra ? <div className="order-sec__extra">{extra}</div> : null}
      </div>
      {open ? <div className="order-sec__body">{children}</div> : null}
    </section>
  );
}

// Work order window (Google-Calendar style), used both for a dragged time range
// (create) and for a clicked calendar block (edit). One order = one project
// (orderType service) + bookings for its workers on each day of the range.
// Kund: a NEW client is filled in by default; "Välj befintlig" picks an existing one.
export default function OrderQuickModal({ open, initial, employees, onCancel, onSave, onDelete, deleteLabel }) {
  const t = useT();
  const editing = !!initial?.projectId;
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(null); // existing client picked
  const [nc, setNc] = useState({ type: 'private', name: '', phone: '', email: '' }); // new client
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [workerIds, setWorkerIds] = useState([]);
  const [address, setAddress] = useState('');
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState([]);

  useEffect(() => {
    try { setCollapsed(JSON.parse(window.localStorage.getItem(COLLAPSE_KEY) || '[]')); } catch { /* all open */ }
  }, []);
  const toggle = (id) => setCollapsed((c) => {
    const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
    try { window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title || '');
    setClientId(initial?.clientId || null);
    setNc({ type: 'private', name: '', phone: '', email: '' });
    setFrom(initial?.date ? dayjs(initial.date) : dayjs());
    setTo(initial?.dateTo ? dayjs(initial.dateTo) : initial?.date ? dayjs(initial.date) : dayjs());
    setWeekdaysOnly(true);
    setStart(initial?.start || '08:00');
    setEnd(initial?.end || '10:00');
    setWorkerIds(initial?.workerIds || []);
    setAddress(initial?.address || '');
    setRows(initial?.rows || []);
    setSaving(false);
    apiClient.get('/articles').then((r) => setArticles(Array.isArray(r.data) ? r.data : [])).catch(() => setArticles([]));
    apiClient.get('/clients').then((r) => setClients(Array.isArray(r.data) ? r.data : [])).catch(() => setClients([]));
  }, [open, initial]);

  const articleOptions = useMemo(
    () => articles
      .filter((a) => a.active !== false)
      .map((a) => ({ value: String(a._id), label: [a.articleNumber, a.name].filter(Boolean).join(' · ') })),
    [articles],
  );
  const clientOptions = useMemo(
    () => clients.map((c) => ({ value: String(c._id), label: getClientDisplayName(c) })),
    [clients],
  );
  const chosen = clientId ? clients.find((c) => String(c._id) === String(clientId)) : null;

  const pickExisting = (id) => {
    setClientId(id || null);
    const c = clients.find((x) => String(x._id) === String(id));
    if (c && !address) setAddress([c.address, c.postalCode, c.city].filter(Boolean).join(', '));
  };

  const addArticle = (id) => {
    const a = articles.find((x) => String(x._id) === String(id));
    if (!a) return;
    setRows((rs) => [...rs, {
      articleId: String(a._id), articleNumber: a.articleNumber || '', name: a.name || '',
      unit: a.unit || 'st', quantity: 1, price: Number(a.priceExclMoms) || 0,
    }]);
  };

  const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hours = Math.max(0, (minutes(end) - minutes(start)) / 60);
  const multiDay = from && to && to.isAfter(from, 'day');
  const invalid = !title.trim() || !from || !to || to.isBefore(from, 'day') || hours <= 0 || saving;

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        clientId: clientId || null,
        newClient: !clientId && nc.name.trim() ? { ...nc, name: nc.name.trim(), address: address.trim() } : null,
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        weekdaysOnly: multiDay ? weekdaysOnly : false,
        start,
        hours,
        workerIds,
        address: address.trim(),
        rows,
      });
    } finally {
      setSaving(false);
    }
  };

  const secProps = { collapsed, onToggle: toggle };

  return (
    <AdminModal
      open={open}
      title={editing ? (initial?.title || t('Work order')) : t('New work order')}
      onCancel={onCancel}
      width={560}
      footer={[
        ...(editing && onDelete ? [<Button key="del" variant="secondary" danger onClick={onDelete}>{deleteLabel || t('Delete')}</Button>] : []),
        <Button key="cancel" variant="secondary" onClick={onCancel}>{t('Cancel')}</Button>,
        <Button key="save" variant="primary" disabled={invalid} loading={saving} onClick={save}>{editing ? t('Save') : t('Create')}</Button>,
      ]}
    >
      <div className="schedule-assign-modal order-quick">
        <label className="schedule-assign-modal__field">
          <span>{t('Title')}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} />
        </label>

        <Section
          id="client"
          title={t('Client')}
          {...secProps}
          extra={(
            <Select
              className="order-sec__pick"
              value={null}
              onChange={pickExisting}
              options={clientOptions}
              showSearch
              optionFilterProp="label"
              placeholder={t('Choose existing')}
              popupMatchSelectWidth={260}
            />
          )}
        >
          {chosen ? (
            <div className="order-quick__chosen">
              <span>{getClientDisplayName(chosen)}</span>
              <button type="button" aria-label={t('Remove')} onClick={() => setClientId(null)}><CloseOutlined /></button>
            </div>
          ) : (
            <>
              <Segmented
                value={nc.type}
                onChange={(v) => setNc((x) => ({ ...x, type: v }))}
                options={[
                  { value: 'private', label: t('Private person') },
                  { value: 'company', label: t('Company') },
                ]}
              />
              <label className="schedule-assign-modal__field">
                <span>{nc.type === 'private' ? t('Name') : t('Company name')}</span>
                <Input value={nc.name} onChange={(e) => setNc((x) => ({ ...x, name: e.target.value }))} />
              </label>
              <div className="schedule-assign-modal__dates">
                <label className="schedule-assign-modal__field">
                  <span>{t('Phone')}</span>
                  <Input value={nc.phone} onChange={(e) => setNc((x) => ({ ...x, phone: e.target.value }))} />
                </label>
                <label className="schedule-assign-modal__field">
                  <span>{t('Email')}</span>
                  <Input value={nc.email} onChange={(e) => setNc((x) => ({ ...x, email: e.target.value }))} />
                </label>
              </div>
            </>
          )}
          <label className="schedule-assign-modal__field">
            <span>{t('Address')}</span>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
        </Section>

        <Section id="time" title={t('Time')} {...secProps}>
          <div className="schedule-assign-modal__dates">
            <label className="schedule-assign-modal__field">
              <span>{t('From')}</span>
              <DatePicker value={from} onChange={(v) => { setFrom(v); if (v && to && to.isBefore(v, 'day')) setTo(v); }} allowClear={false} style={{ width: '100%' }} />
            </label>
            <label className="schedule-assign-modal__field">
              <span>{t('To')}</span>
              <DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} />
            </label>
          </div>
          <div className="schedule-assign-modal__dates">
            <label className="schedule-assign-modal__field">
              <span>{t('Start time')}</span>
              <TimePicker value={asTime(start)} onChange={(v) => v && setStart(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </label>
            <label className="schedule-assign-modal__field">
              <span>{t('End time')}</span>
              <TimePicker value={asTime(end)} onChange={(v) => v && setEnd(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </label>
          </div>
          {multiDay ? (
            <Checkbox checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)}>{t('Weekdays only')}</Checkbox>
          ) : null}
        </Section>

        <Section id="staff" title={t('Workers')} {...secProps}>
          <Select mode="multiple" value={workerIds} onChange={setWorkerIds} options={employees} showSearch optionFilterProp="label" placeholder={t('Select employee')} style={{ width: '100%' }} />
        </Section>

        <Section id="articles" title={t('Articles')} {...secProps}>
          {rows.map((r, i) => (
            <div key={`${r.articleId}-${i}`} className="order-quick__row">
              <span className="order-quick__name">{[r.articleNumber, r.name].filter(Boolean).join(' · ')}</span>
              <InputNumber min={0.01} value={r.quantity} onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, quantity: v || 1 } : x)))} style={{ width: 80 }} />
              <span className="order-quick__unit">{r.unit}</span>
              <button type="button" className="teammgr__del" aria-label={t('Remove')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><DeleteOutlined /></button>
            </div>
          ))}
          <Select value={null} onChange={addArticle} options={articleOptions} showSearch optionFilterProp="label" placeholder={t('Search article')} style={{ width: '100%' }} />
        </Section>
      </div>
    </AdminModal>
  );
}
