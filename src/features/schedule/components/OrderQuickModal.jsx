import { useEffect, useMemo, useState } from 'react';
import { DatePicker, InputNumber, TimePicker } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { Input, Select } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';

const asTime = (hhmm) => dayjs(`2000-01-01T${hhmm}`);

// Calendar quick-create (Google-Calendar style): a dragged time range opens
// this — title, workers, articles → one service order + the workers' bookings.
export default function OrderQuickModal({ open, initial, employees, onCancel, onCreate }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => dayjs());
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [workerIds, setWorkerIds] = useState([]);
  const [address, setAddress] = useState('');
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDate(initial?.date ? dayjs(initial.date) : dayjs());
    setStart(initial?.start || '08:00');
    setEnd(initial?.end || '10:00');
    setWorkerIds(initial?.workerIds || []);
    setAddress('');
    setRows([]);
    setSaving(false);
    apiClient.get('/articles').then((r) => setArticles(Array.isArray(r.data) ? r.data : [])).catch(() => setArticles([]));
  }, [open, initial]);

  const articleOptions = useMemo(
    () => articles
      .filter((a) => a.active !== false)
      .map((a) => ({ value: String(a._id), label: [a.articleNumber, a.name].filter(Boolean).join(' · ') })),
    [articles],
  );

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
  const invalid = !title.trim() || !date || hours <= 0 || saving;

  const save = async () => {
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), date: date.format('YYYY-MM-DD'), start, hours, workerIds, address: address.trim(), rows });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open={open}
      title={t('New work order')}
      onCancel={onCancel}
      saveText={t('Create')}
      saveDisabled={invalid}
      width={520}
      onSave={save}
    >
      <div className="schedule-assign-modal">
        <label className="schedule-assign-modal__field">
          <span>{t('Title')}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <div className="schedule-assign-modal__dates schedule-assign-modal__dates--3">
          <label className="schedule-assign-modal__field">
            <span>{t('Date')}</span>
            <DatePicker value={date} onChange={setDate} allowClear={false} style={{ width: '100%' }} />
          </label>
          <label className="schedule-assign-modal__field">
            <span>{t('From')}</span>
            <TimePicker value={asTime(start)} onChange={(v) => v && setStart(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
          </label>
          <label className="schedule-assign-modal__field">
            <span>{t('To')}</span>
            <TimePicker value={asTime(end)} onChange={(v) => v && setEnd(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
          </label>
        </div>
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
