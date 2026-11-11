import { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, InputNumber, TimePicker } from 'antd';
import { CloseOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { Button, Input, Segmented, Select, Textarea } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { STATUS_OPTIONS } from '@/src/features/projects/components/projectFormUtils';
import { useAuthStore } from '@/src/store/authStore';

const asTime = (hhmm) => dayjs(`2000-01-01T${hhmm}`);
const COLLAPSE_KEY = 'order-modal-collapsed-v3';
const DEFAULT_COLLAPSED = ['economy'];
const EMPTY_CLIENT = {
  clientType: 'private', firstName: '', lastName: '', companyName: '', orgNumber: '', contactPerson: '',
  phone: '', email: '', address: '', postalCode: '', city: '',
};

// One collapsible block of the order window (header click folds it).
function Section({ id, title, collapsed, onToggle, children }) {
  const open = !collapsed.includes(id);
  return (
    <section className={`order-sec${open ? ' is-open' : ''}`}>
      <div className="order-sec__head">
        <button type="button" className="order-sec__toggle" onClick={() => onToggle(id)} aria-expanded={open}>
          <DownOutlined className="order-sec__chev" />
          <span>{title}</span>
        </button>
      </div>
      {open ? <div className="order-sec__body">{children}</div> : null}
    </section>
  );
}

const Fld = ({ label, children }) => (
  <label className="schedule-assign-modal__field"><span>{label}</span>{children}</label>
);
const Row = ({ children, className = '' }) => <div className={`schedule-assign-modal__dates ${className}`}>{children}</div>;
const fullAddress = (c) => [c?.address, [c?.postalCode, c?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('sv-SE')} kr`;

// Work order window, in the order of a phone call: what (title, reference,
// description) → who (client: search existing or fill in a new one) → when →
// who does it → articles → economy (collapsed). Used for a dragged time range
// (create) and for a clicked calendar block (edit). Owner rule: nothing extra.
export default function OrderQuickModal({ open, initial, employees, managers, onCancel, onSave, onDelete, deleteLabel }) {
  const t = useT();
  const me = useAuthStore((st) => st.user);
  const editing = !!initial?.projectId;
  const [title, setTitle] = useState('');
  const [littera, setLittera] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [managerId, setManagerId] = useState(undefined);
  const [budget, setBudget] = useState(null);
  const [billRate, setBillRate] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [nc, setNc] = useState(EMPTY_CLIENT);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [multiDay, setMultiDay] = useState(false);
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [workerIds, setWorkerIds] = useState([]);
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(DEFAULT_COLLAPSED);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COLLAPSE_KEY);
      if (saved) setCollapsed(JSON.parse(saved));
    } catch { /* defaults */ }
  }, []);
  const toggle = (id) => setCollapsed((c) => {
    const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
    try { window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  useEffect(() => {
    if (!open) return;
    const p = initial?.project || {};
    setTitle(initial?.title || '');
    setLittera(editing ? (p.littera || '') : '');
    setDescription(editing ? (p.description || '') : '');
    setStatus(editing ? (p.status || 'planning') : 'planning');
    setManagerId(editing ? (p.projectManagerId?._id || p.projectManagerId || undefined) : (me?._id || me?.id || undefined));
    setBudget(editing ? (p.budget ?? null) : null);
    setBillRate(editing ? (p.billRatePerHour ?? null) : null);
    setClientId(initial?.clientId || null);
    setNc(EMPTY_CLIENT);
    const f = initial?.date ? dayjs(initial.date) : dayjs();
    const tt = initial?.dateTo ? dayjs(initial.dateTo) : f;
    setFrom(f);
    setTo(tt);
    setMultiDay(tt.isAfter(f, 'day'));
    setWeekdaysOnly(true);
    setStart(initial?.start || '08:00');
    setEnd(initial?.end || '10:00');
    setWorkerIds(initial?.workerIds || []);
    setRows(initial?.rows || []);
    setSaving(false);
    apiClient.get('/articles').then((r) => setArticles(Array.isArray(r.data) ? r.data : [])).catch(() => setArticles([]));
    apiClient.get('/clients').then((r) => setClients(Array.isArray(r.data) ? r.data : [])).catch(() => setClients([]));
  }, [open, initial, editing, me]);

  const articleOptions = useMemo(
    () => articles
      .filter((a) => a.active !== false)
      .map((a) => ({ value: String(a._id), label: [a.articleNumber, a.name].filter(Boolean).join(' · ') })),
    [articles],
  );
  // Search by name, phone or address — what the customer says on the phone.
  const clientOptions = useMemo(
    () => clients.map((c) => ({
      value: String(c._id),
      label: [getClientDisplayName(c), c.phone || c.mobile, fullAddress(c)].filter(Boolean).join(' · '),
    })),
    [clients],
  );
  const chosen = clientId ? clients.find((c) => String(c._id) === String(clientId)) : null;
  const setC = (k) => (v) => setNc((c) => ({ ...c, [k]: v?.target ? v.target.value : v }));

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
  const effTo = multiDay ? to : from;
  const invalid = !title.trim() || !from || !effTo || effTo.isBefore(from, 'day') || hours <= 0 || saving;
  const clientHasName = nc.clientType === 'private' ? `${nc.firstName}${nc.lastName}`.trim() : nc.companyName.trim();

  const save = async () => {
    setSaving(true);
    try {
      const days = Math.max(1, effTo.diff(from, 'day') + 1);
      await onSave({
        title: title.trim(),
        order: {
          littera: littera.trim(),
          description: description.trim(),
          ...(editing ? { status } : {}),
          projectManagerId: managerId,
          budget,
          billRatePerHour: billRate,
          plannedHours: Math.round(hours * days * 10) / 10,
        },
        clientId: clientId || null,
        newClient: !clientId && clientHasName ? nc : null,
        address: clientId ? fullAddress(chosen) : fullAddress(nc),
        from: from.format('YYYY-MM-DD'),
        to: effTo.format('YYYY-MM-DD'),
        weekdaysOnly: multiDay ? weekdaysOnly : false,
        start,
        hours,
        workerIds,
        rows,
      });
    } finally {
      setSaving(false);
    }
  };

  const sec = { collapsed, onToggle: toggle };

  return (
    <AdminModal
      open={open}
      title={editing ? (initial?.title || t('Work order')) : t('New work order')}
      onCancel={onCancel}
      maskClosable={false}
      width={600}
      footer={[
        ...(editing && onDelete ? [<Button key="del" variant="secondary" danger onClick={onDelete}>{deleteLabel || t('Delete')}</Button>] : []),
        <Button key="cancel" variant="secondary" onClick={onCancel}>{t('Cancel')}</Button>,
        <Button key="save" variant="primary" disabled={invalid} loading={saving} onClick={save}>{editing ? t('Save') : t('Create')}</Button>,
      ]}
    >
      <div className="schedule-assign-modal order-quick">
        <Row className="order-quick__head">
          <Fld label={t('Title')}><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} /></Fld>
          <Fld label={t('Order reference')}><Input value={littera} onChange={(e) => setLittera(e.target.value)} /></Fld>
        </Row>
        <Fld label={t('Description')}><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></Fld>
        {editing ? (
          <Fld label={t('Status')}>
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} style={{ width: '100%' }} />
          </Fld>
        ) : null}

        <Section id="client" title={t('Client')} {...sec}>
          {chosen ? (
            <div className="order-quick__chosen">
              <span>{clientOptions.find((o) => o.value === String(clientId))?.label}</span>
              <button type="button" aria-label={t('Remove')} onClick={() => setClientId(null)}><CloseOutlined /></button>
            </div>
          ) : (
            <>
              <Select
                value={null}
                onChange={(v) => setClientId(v || null)}
                options={clientOptions}
                showSearch
                optionFilterProp="label"
                placeholder={t('Search existing client — name, phone or address')}
                style={{ width: '100%' }}
              />
              <Segmented
                value={nc.clientType}
                onChange={setC('clientType')}
                options={[{ value: 'private', label: t('New private person') }, { value: 'company', label: t('New company') }]}
              />
              {nc.clientType === 'private' ? (
                <Row>
                  <Fld label={t('First name')}><Input value={nc.firstName} onChange={setC('firstName')} /></Fld>
                  <Fld label={t('Last name')}><Input value={nc.lastName} onChange={setC('lastName')} /></Fld>
                </Row>
              ) : (
                <>
                  <Row>
                    <Fld label={t('Company name')}><Input value={nc.companyName} onChange={setC('companyName')} /></Fld>
                    <Fld label={t('Org no.')}><Input value={nc.orgNumber} onChange={setC('orgNumber')} /></Fld>
                  </Row>
                  <Fld label={t('Contact person')}><Input value={nc.contactPerson} onChange={setC('contactPerson')} /></Fld>
                </>
              )}
              <Row>
                <Fld label={t('Phone')}><Input value={nc.phone} onChange={setC('phone')} /></Fld>
                <Fld label={t('Email')}><Input value={nc.email} onChange={setC('email')} /></Fld>
              </Row>
              <Fld label={t('Address')}><Input value={nc.address} onChange={setC('address')} /></Fld>
              <Row className="order-quick__zip">
                <Fld label={t('Postal code')}><Input value={nc.postalCode} onChange={setC('postalCode')} /></Fld>
                <Fld label={t('City')}><Input value={nc.city} onChange={setC('city')} /></Fld>
              </Row>
            </>
          )}
        </Section>

        <Section id="time" title={t('Time')} {...sec}>
          <div className="order-quick__when">
            <Fld label={multiDay ? t('From') : t('Date')}>
              <DatePicker value={from} onChange={(v) => { setFrom(v); if (v && to && to.isBefore(v, 'day')) setTo(v); }} allowClear={false} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('Start time')}>
              <TimePicker value={asTime(start)} onChange={(v) => v && setStart(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('End time')}>
              <TimePicker value={asTime(end)} onChange={(v) => v && setEnd(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </Fld>
          </div>
          {multiDay ? (
            <>
              <Fld label={t('To')}><DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} /></Fld>
              <Checkbox checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)}>{t('Weekdays only')}</Checkbox>
            </>
          ) : (
            <button type="button" className="order-quick__link" onClick={() => { setMultiDay(true); setTo(from.add(1, 'day')); }}>+ {t('Several days')}</button>
          )}
        </Section>

        <Section id="staff" title={t('Staff')} {...sec}>
          <Fld label={t('Workers')}>
            <Select mode="multiple" value={workerIds} onChange={setWorkerIds} options={employees} showSearch optionFilterProp="label" placeholder={t('Select employee')} style={{ width: '100%' }} />
          </Fld>
          <Fld label={t('Responsible')}>
            <Select value={managerId} onChange={setManagerId} options={managers} showSearch optionFilterProp="label" allowClear style={{ width: '100%' }} />
          </Fld>
        </Section>

        <Section id="articles" title={t('Articles')} {...sec}>
          {rows.length ? (
            <div className="order-quick__rows">
              <div className="order-quick__rowhead"><span>{t('Article')}</span><span>{t('Quantity')}</span><span>{t('Price')}</span><span /></div>
              {rows.map((r, i) => (
                <div key={`${r.articleId}-${i}`} className="order-quick__row">
                  <span className="order-quick__name">{[r.articleNumber, r.name].filter(Boolean).join(' · ')}</span>
                  <InputNumber
                    min={0.01}
                    value={r.quantity}
                    onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, quantity: v || 1 } : x)))}
                    suffix={r.unit}
                    style={{ width: '100%' }}
                  />
                  <span className="order-quick__price">{kr((r.price || 0) * (r.quantity || 0))}</span>
                  <button type="button" className="teammgr__del" aria-label={t('Remove')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><DeleteOutlined /></button>
                </div>
              ))}
            </div>
          ) : null}
          <Select value={null} onChange={addArticle} options={articleOptions} showSearch optionFilterProp="label" placeholder={t('Search article')} style={{ width: '100%' }} />
        </Section>

        <Section id="economy" title={t('Economy')} {...sec}>
          <Row>
            <Fld label={t('Budget (SEK)')}><InputNumber min={0} value={budget} onChange={setBudget} style={{ width: '100%' }} /></Fld>
            <Fld label={t('Bill rate / hour — billed (SEK)')}><InputNumber min={0} value={billRate} onChange={setBillRate} style={{ width: '100%' }} /></Fld>
          </Row>
        </Section>
      </div>
    </AdminModal>
  );
}
