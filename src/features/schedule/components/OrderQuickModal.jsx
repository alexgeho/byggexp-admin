import { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, InputNumber, Switch, TimePicker } from 'antd';
import { CloseOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { Button, Input, Segmented, Select, Textarea } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { useAuthStore } from '@/src/store/authStore';
import { ORDER_TYPE_OPTIONS, STATUS_OPTIONS } from '@/src/features/projects/components/projectFormUtils';

const asTime = (hhmm) => dayjs(`2000-01-01T${hhmm}`);
const COLLAPSE_KEY = 'order-modal-collapsed-v2';
const DEFAULT_COLLAPSED = ['client-pay', 'economy'];
const PAYMENT_TERMS = ['10', '20', '30', '40', '50'];
const CURRENCIES = ['SEK', 'EUR', 'USD', 'NOK', 'DKK'];

const EMPTY_ORDER = {
  littera: '', orderType: 'service', status: 'planning', projectManagerId: undefined, description: '',
  budget: null, plannedHours: null, plannedMaterialsCost: null, costRatePerHour: null, billRatePerHour: null, toolIds: [],
};
const EMPTY_CLIENT = {
  clientType: 'private', firstName: '', lastName: '', personalNumber: '', companyName: '', orgNumber: '',
  vatNumber: '', contactPerson: '', customerNumber: '', phone: '', mobile: '', email: '', website: '',
  address: '', postalCode: '', city: '', country: 'Sverige',
  paymentTerms: '30', currency: 'SEK', discount: '0', hourlyRate: null, reverseVAT: false, notes: '',
};

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

const Fld = ({ label, children }) => (
  <label className="schedule-assign-modal__field"><span>{label}</span>{children}</label>
);
const Row = ({ children }) => <div className="schedule-assign-modal__dates">{children}</div>;

// Work order window (Google-Calendar style): everything in one place — the
// order (all project fields), the client (all client fields, new by default,
// or pick an existing one), time, crew + tools and articles. Used for a
// dragged time range (create) and for a clicked calendar block (edit).
export default function OrderQuickModal({ open, initial, employees, managers, onCancel, onSave, onDelete, deleteLabel }) {
  const t = useT();
  const companyId = useAuthStore((st) => st.user?.companyId);
  const editing = !!initial?.projectId;
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(EMPTY_ORDER);
  const [clientId, setClientId] = useState(null); // existing client picked
  const [nc, setNc] = useState(EMPTY_CLIENT); // new client
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [workerIds, setWorkerIds] = useState([]);
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [tools, setTools] = useState([]);
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
    setOrder({
      ...EMPTY_ORDER,
      ...(editing ? {
        littera: p.littera || '', orderType: p.orderType || 'service', status: p.status || 'planning',
        projectManagerId: p.projectManagerId?._id || p.projectManagerId || undefined, description: p.description || '',
        budget: p.budget ?? null, plannedHours: p.plannedHours ?? null, plannedMaterialsCost: p.plannedMaterialsCost ?? null,
        costRatePerHour: p.costRatePerHour ?? null, billRatePerHour: p.billRatePerHour ?? null,
        toolIds: (p.tools || p.toolIds || []).map((x) => String(x?._id || x)),
      } : {}),
    });
    setClientId(initial?.clientId || null);
    setNc({ ...EMPTY_CLIENT, address: editing && !initial?.clientId ? (initial?.address || '') : '' });
    setFrom(initial?.date ? dayjs(initial.date) : dayjs());
    setTo(initial?.dateTo ? dayjs(initial.dateTo) : initial?.date ? dayjs(initial.date) : dayjs());
    setWeekdaysOnly(true);
    setStart(initial?.start || '08:00');
    setEnd(initial?.end || '10:00');
    setWorkerIds(initial?.workerIds || []);
    setRows(initial?.rows || []);
    setSaving(false);
    apiClient.get('/articles').then((r) => setArticles(Array.isArray(r.data) ? r.data : [])).catch(() => setArticles([]));
    apiClient.get('/clients').then((r) => setClients(Array.isArray(r.data) ? r.data : [])).catch(() => setClients([]));
    apiClient.get('/tools').then((r) => setTools(Array.isArray(r.data) ? r.data : (r.data?.data || []))).catch(() => setTools([]));
    if (!editing) {
      apiClient.get('/clients/next-number', { params: companyId ? { companyId } : undefined }).then((r) => r.data?.nextNumber && setNc((x) => ({ ...x, customerNumber: String(r.data.nextNumber) }))).catch(() => {});
    }
  }, [open, initial, editing, companyId]);

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
  const toolOptions = useMemo(() => tools.map((x) => ({ value: String(x._id), label: x.name || x.title || 'Tool' })), [tools]);
  const chosen = clientId ? clients.find((c) => String(c._id) === String(clientId)) : null;
  const setO = (k) => (v) => setOrder((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
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
  const multiDay = from && to && to.isAfter(from, 'day');
  const invalid = !title.trim() || !from || !to || to.isBefore(from, 'day') || hours <= 0 || saving;
  const clientHasName = nc.clientType === 'private' ? (nc.firstName || nc.lastName).trim() : nc.companyName.trim();
  const fullAddress = (c) => [c?.address, [c?.postalCode, c?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        order,
        clientId: clientId || null,
        newClient: !clientId && clientHasName ? nc : null,
        address: clientId ? fullAddress(chosen) : fullAddress(nc),
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
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
  const num = (k, setter, obj) => <InputNumber min={0} value={obj[k]} onChange={setter(k)} style={{ width: '100%' }} />;

  return (
    <AdminModal
      open={open}
      title={editing ? (initial?.title || t('Work order')) : t('New work order')}
      onCancel={onCancel}
      width={640}
      footer={[
        ...(editing && onDelete ? [<Button key="del" variant="secondary" danger onClick={onDelete}>{deleteLabel || t('Delete')}</Button>] : []),
        <Button key="cancel" variant="secondary" onClick={onCancel}>{t('Cancel')}</Button>,
        <Button key="save" variant="primary" disabled={invalid} loading={saving} onClick={save}>{editing ? t('Save') : t('Create')}</Button>,
      ]}
    >
      <div className="schedule-assign-modal order-quick">
        <Fld label={t('Title')}><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} /></Fld>

        <Section id="order" title={t('Order')} {...sec}>
          <Row>
            <Fld label={t('Order reference')}><Input value={order.littera} onChange={setO('littera')} /></Fld>
            <Fld label={t('Order type')}>
              <Select value={order.orderType} onChange={setO('orderType')} options={ORDER_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} style={{ width: '100%' }} />
            </Fld>
          </Row>
          <Row>
            <Fld label={t('Status')}>
              <Select value={order.status} onChange={setO('status')} options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('Project manager')}>
              <Select value={order.projectManagerId} onChange={setO('projectManagerId')} options={managers} showSearch optionFilterProp="label" allowClear style={{ width: '100%' }} />
            </Fld>
          </Row>
          <Fld label={t('Note')}><Textarea value={order.description} onChange={setO('description')} rows={2} /></Fld>
        </Section>

        <Section
          id="client"
          title={t('Client')}
          {...sec}
          extra={(
            <Select
              className="order-sec__pick"
              value={null}
              onChange={(v) => setClientId(v || null)}
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
              <span>{getClientDisplayName(chosen)}{fullAddress(chosen) ? ` · ${fullAddress(chosen)}` : ''}</span>
              <button type="button" aria-label={t('Remove')} onClick={() => setClientId(null)}><CloseOutlined /></button>
            </div>
          ) : (
            <>
              <Segmented
                value={nc.clientType}
                onChange={setC('clientType')}
                options={[{ value: 'private', label: t('Private person') }, { value: 'company', label: t('Company') }]}
              />
              {nc.clientType === 'private' ? (
                <>
                  <Row>
                    <Fld label={t('First name')}><Input value={nc.firstName} onChange={setC('firstName')} /></Fld>
                    <Fld label={t('Last name')}><Input value={nc.lastName} onChange={setC('lastName')} /></Fld>
                  </Row>
                  <Row>
                    <Fld label={t('Personnummer')}><Input value={nc.personalNumber} onChange={setC('personalNumber')} /></Fld>
                    <Fld label={t('Customer no.')}><Input value={nc.customerNumber} onChange={setC('customerNumber')} /></Fld>
                  </Row>
                </>
              ) : (
                <>
                  <Row>
                    <Fld label={t('Company name')}><Input value={nc.companyName} onChange={setC('companyName')} /></Fld>
                    <Fld label={t('Org no.')}><Input value={nc.orgNumber} onChange={setC('orgNumber')} /></Fld>
                  </Row>
                  <Row>
                    <Fld label={t('Contact person')}><Input value={nc.contactPerson} onChange={setC('contactPerson')} /></Fld>
                    <Fld label={t('VAT reg no.')}><Input value={nc.vatNumber} onChange={setC('vatNumber')} /></Fld>
                  </Row>
                  <Fld label={t('Customer no.')}><Input value={nc.customerNumber} onChange={setC('customerNumber')} /></Fld>
                </>
              )}
              <Row>
                <Fld label={t('Phone')}><Input value={nc.phone} onChange={setC('phone')} /></Fld>
                <Fld label={t('Mobile')}><Input value={nc.mobile} onChange={setC('mobile')} /></Fld>
              </Row>
              <Row>
                <Fld label={t('Email')}><Input value={nc.email} onChange={setC('email')} /></Fld>
                <Fld label={t('Website')}><Input value={nc.website} onChange={setC('website')} /></Fld>
              </Row>
              <Fld label={t('Address')}><Input value={nc.address} onChange={setC('address')} /></Fld>
              <div className="order-quick__addr">
                <Fld label={t('Postal code')}><Input value={nc.postalCode} onChange={setC('postalCode')} /></Fld>
                <Fld label={t('City')}><Input value={nc.city} onChange={setC('city')} /></Fld>
                <Fld label={t('Country')}><Input value={nc.country} onChange={setC('country')} /></Fld>
              </div>
            </>
          )}
        </Section>

        {!chosen ? (
          <Section id="client-pay" title={t('Payment terms')} {...sec}>
            <Row>
              <Fld label={t('Payment terms')}>
                <Select value={nc.paymentTerms} onChange={setC('paymentTerms')} options={PAYMENT_TERMS.map((v) => ({ value: v, label: `${v} ${t('days')}` }))} style={{ width: '100%' }} />
              </Fld>
              <Fld label={t('Currency')}>
                <Select value={nc.currency} onChange={setC('currency')} options={CURRENCIES.map((v) => ({ value: v, label: v }))} style={{ width: '100%' }} />
              </Fld>
            </Row>
            <Row>
              <Fld label={t('Customer discount %')}><Input value={nc.discount} onChange={setC('discount')} /></Fld>
              <Fld label={t('Hourly rate — billed (SEK)')}>{num('hourlyRate', setC, nc)}</Fld>
            </Row>
            <label className="order-quick__switch">
              <Switch checked={nc.reverseVAT} onChange={setC('reverseVAT')} size="small" />
              <span>{t('Reverse VAT liability')}</span>
            </label>
            <Fld label={t('Notes')}><Textarea value={nc.notes} onChange={setC('notes')} rows={2} /></Fld>
          </Section>
        ) : null}

        <Section id="time" title={t('Time')} {...sec}>
          <Row>
            <Fld label={t('From')}>
              <DatePicker value={from} onChange={(v) => { setFrom(v); if (v && to && to.isBefore(v, 'day')) setTo(v); }} allowClear={false} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('To')}><DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} /></Fld>
          </Row>
          <Row>
            <Fld label={t('Start time')}>
              <TimePicker value={asTime(start)} onChange={(v) => v && setStart(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('End time')}>
              <TimePicker value={asTime(end)} onChange={(v) => v && setEnd(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </Fld>
          </Row>
          {multiDay ? (
            <Checkbox checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)}>{t('Weekdays only')}</Checkbox>
          ) : null}
        </Section>

        <Section id="staff" title={t('Workers')} {...sec}>
          <Select mode="multiple" value={workerIds} onChange={setWorkerIds} options={employees} showSearch optionFilterProp="label" placeholder={t('Select employee')} style={{ width: '100%' }} />
          <Fld label={t('Tools')}>
            <Select mode="multiple" value={order.toolIds} onChange={setO('toolIds')} options={toolOptions} showSearch optionFilterProp="label" style={{ width: '100%' }} />
          </Fld>
        </Section>

        <Section id="articles" title={t('Articles')} {...sec}>
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

        <Section id="economy" title={t('Economy')} {...sec}>
          <Row>
            <Fld label={t('Total budget (SEK)')}>{num('budget', setO, order)}</Fld>
            <Fld label={t('Planned hours')}>{num('plannedHours', setO, order)}</Fld>
          </Row>
          <Row>
            <Fld label={t('Planned materials (SEK)')}>{num('plannedMaterialsCost', setO, order)}</Fld>
            <Fld label={t('Cost rate / hour — self-cost (SEK)')}>{num('costRatePerHour', setO, order)}</Fld>
          </Row>
          <Fld label={t('Bill rate / hour — billed (SEK)')}>{num('billRatePerHour', setO, order)}</Fld>
        </Section>
      </div>
    </AdminModal>
  );
}
