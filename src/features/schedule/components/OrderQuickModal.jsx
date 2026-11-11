import { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, InputNumber, TimePicker } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { Button, Input, Select } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';

const asTime = (hhmm) => dayjs(`2000-01-01T${hhmm}`);
const NEW_PRIVATE = '__new_private__';
const NEW_COMPANY = '__new_company__';

// Work order window (Google-Calendar style), used both for a dragged time range
// (create) and for a clicked calendar block (edit). One order = one project
// (orderType service) + bookings for its workers on each day of the range.
export default function OrderQuickModal({ open, initial, employees, onCancel, onSave, onDelete, deleteLabel }) {
  const t = useT();
  const editing = !!initial?.projectId;
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(null);
  const [clientQuery, setClientQuery] = useState('');
  const [newClient, setNewClient] = useState(null); // { type, name } created on save
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

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title || '');
    setClientId(initial?.clientId || null);
    setClientQuery('');
    setNewClient(null);
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

  const clientOptions = useMemo(() => {
    const opts = clients.map((c) => ({ value: String(c._id), label: getClientDisplayName(c) }));
    const q = clientQuery.trim();
    if (q && !opts.some((o) => o.label.toLowerCase() === q.toLowerCase())) {
      opts.push({ value: NEW_PRIVATE, label: `+ ${t('Private person')}: ${q}` });
      opts.push({ value: NEW_COMPANY, label: `+ ${t('Company')}: ${q}` });
    }
    if (newClient) opts.unshift({ value: '__pending__', label: `${newClient.name} (${t('new')})` });
    return opts;
  }, [clients, clientQuery, newClient, t]);

  const pickClient = (v) => {
    if (v === NEW_PRIVATE || v === NEW_COMPANY) {
      setNewClient({ type: v === NEW_PRIVATE ? 'private' : 'company', name: clientQuery.trim() });
      setClientId('__pending__');
      return;
    }
    if (v !== '__pending__') setNewClient(null);
    setClientId(v || null);
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
        clientId: clientId === '__pending__' ? null : clientId,
        newClient,
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
      <div className="schedule-assign-modal">
        <label className="schedule-assign-modal__field">
          <span>{t('Title')}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} />
        </label>
        <label className="schedule-assign-modal__field">
          <span>{t('Client')}</span>
          <Select
            value={clientId}
            onChange={pickClient}
            onSearch={setClientQuery}
            searchValue={clientQuery}
            options={clientOptions}
            showSearch
            allowClear
            filterOption={(input, opt) => String(opt.value).startsWith('__') || String(opt.label).toLowerCase().includes(input.toLowerCase())}
            placeholder={t('Choose or add a client')}
            style={{ width: '100%' }}
          />
        </label>
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
        <label className="schedule-assign-modal__field">
          <span>{t('Workers')}</span>
          <Select mode="multiple" value={workerIds} onChange={setWorkerIds} options={employees} showSearch optionFilterProp="label" placeholder={t('Select employee')} style={{ width: '100%' }} />
        </label>
        <label className="schedule-assign-modal__field">
          <span>{t('Address')}</span>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <div className="schedule-assign-modal__field">
          <span>{t('Articles')}</span>
          {rows.map((r, i) => (
            <div key={`${r.articleId}-${i}`} className="order-quick__row">
              <span className="order-quick__name">{[r.articleNumber, r.name].filter(Boolean).join(' · ')}</span>
              <InputNumber min={0.01} value={r.quantity} onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, quantity: v || 1 } : x)))} style={{ width: 80 }} />
              <span className="order-quick__unit">{r.unit}</span>
              <button type="button" className="teammgr__del" aria-label={t('Remove')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><DeleteOutlined /></button>
            </div>
          ))}
          <Select value={null} onChange={addArticle} options={articleOptions} showSearch optionFilterProp="label" placeholder={t('Search article')} style={{ width: '100%' }} />
        </div>
      </div>
    </AdminModal>
  );
}
