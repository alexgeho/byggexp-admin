import { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, InputNumber, TimePicker } from 'antd';
import { CloseOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { Button, Input, Segmented, Select } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { STATUS_OPTIONS } from '@/src/features/projects/components/projectFormUtils';
import { useAuthStore } from '@/src/store/authStore';
import { appMessage } from '@/src/utils/appMessage';

const asTime = (hhmm) => dayjs(`2000-01-01T${hhmm}`);
const COLLAPSE_KEY = 'order-modal-collapsed-v3';
const DEFAULT_COLLAPSED = ['economy'];
const EMPTY_CLIENT = {
  clientType: 'private', firstName: '', lastName: '', companyName: '', orgNumber: '', contactPerson: '',
  phone: '', email: '',
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
const Row = ({ children, className = '' }) => <div className={`schedule-assign-modal__dates ${className}`}>{children}</div>;
const kr = (n) => (Number(n) ? `${Math.round(Number(n)).toLocaleString('sv-SE')} kr` : '–'); // empty = one dash (design system)

// Work order window, in the order of a phone call: what (title, reference,
// description) → who (client: search existing or fill in a new one) → when →
// who does it → articles → economy (collapsed). Used for a dragged time range
// (create) and for a clicked calendar block (edit). Owner rule: nothing extra.
export default function OrderQuickModal({ open, initial, employees, orders = [], onEmployeeAdded, onCancel, onSave, onDelete, deleteLabel }) {
  const t = useT();
  const me = useAuthStore((st) => st.user);
  const editing = !!initial?.projectId;
  const [title, setTitle] = useState('');
  const [littera, setLittera] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [status, setStatus] = useState('planning');
  const [managerId, setManagerId] = useState(undefined);
  const [budget, setBudget] = useState(null);
  const [billRate, setBillRate] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [existingId, setExistingId] = useState(null); // add this booking to an existing order
  const [nc, setNc] = useState(EMPTY_CLIENT);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [workerIds, setWorkerIds] = useState([]);
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newEmp, setNewEmp] = useState(null); // { name, email } while adding a new employee inline
  const extraEmployees = [];
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
    setOrderAddress(editing ? (p.location || initial?.address || '') : '');
    setStatus(editing ? (p.status || 'planning') : 'planning');
    setManagerId(editing ? (p.projectManagerId?._id || p.projectManagerId || undefined) : (me?._id || me?.id || undefined));
    setBudget(editing ? (p.budget ?? null) : null);
    setBillRate(editing ? (p.billRatePerHour ?? null) : null);
    setClientId(initial?.clientId || null);
    setExistingId(null);
    setNc(EMPTY_CLIENT);
    const f = initial?.date ? dayjs(initial.date) : dayjs();
    const tt = initial?.dateTo ? dayjs(initial.dateTo) : f;
    setFrom(f);
    setTo(tt);
    setWeekdaysOnly(true);
    setStart(initial?.start || '08:00');
    setEnd(initial?.end || '10:00');
    setWorkerIds(initial?.workerIds || []);
    setRows(initial?.rows || []);
    setNewEmp(null);
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
  const clientOptions = useMemo(
    () => clients.map((c) => ({
      value: String(c._id),
      label: getClientDisplayName(c),
    })),
    [clients],
  );
  const chosen = clientId ? clients.find((c) => String(c._id) === String(clientId)) : null;
  const orderOptions = useMemo(
    () => orders.map((p) => ({ value: String(p._id || p.id), label: p.name || '—' })),
    [orders],
  );
  const existingOrder = existingId ? orders.find((p) => String(p._id || p.id) === String(existingId)) : null;
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
  const multiDay = !!(from && to && to.isAfter(from, 'day'));
  const effTo = to;
  const invalid = (!existingId && !title.trim()) || !from || !effTo || effTo.isBefore(from, 'day') || hours <= 0 || saving;
  const clientHasName = nc.clientType === 'private' ? `${nc.firstName}${nc.lastName}`.trim() : nc.companyName.trim();

  // Quick-add a worker without leaving the window (invite e-mail goes out as usual).
  const addEmployee = async () => {
    try {
      const { data } = await apiClient.post('/users', {
        name: newEmp.name.trim(),
        email: newEmp.email.trim(),
        role: 'worker',
        inviteViaEmail: true,
        ...(me?.companyId ? { companyId: me.companyId } : {}),
      });
      const id = String(data?._id || data?.id || data?.user?._id || '');
      onEmployeeAdded?.();
      return id || null;
    } catch (err) {
      appMessage.error(err?.response?.data?.message || t('Could not save'));
      return null;
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let ids = workerIds;
      if (newEmp?.name?.trim() && /\S+@\S+\.\S+/.test(newEmp?.email || '')) {
        const id = await addEmployee();
        if (id) ids = [...ids, id];
      }
      const days = Math.max(1, effTo.diff(from, 'day') + 1);
      await onSave({
        existingId,
        title: existingOrder ? existingOrder.name : title.trim(),
        order: {
          littera: littera.trim(),
          ...(editing ? { status } : {}),
          projectManagerId: managerId,
          budget,
          billRatePerHour: billRate,
          plannedHours: Math.round(hours * days * 10) / 10,
        },
        clientId: clientId || null,
        newClient: !existingId && !clientId && clientHasName ? nc : null,
        address: orderAddress.trim(),
        from: from.format('YYYY-MM-DD'),
        to: effTo.format('YYYY-MM-DD'),
        weekdaysOnly: multiDay ? weekdaysOnly : false,
        start,
        hours,
        workerIds: ids,
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
      <div className="schedule-assign-modal order-quick admin-modal-form">
        {editing ? (
          <>
            <Row className="order-quick__head">
              <Fld label={t('Title')}><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Fld>
              <Fld label={t('Order reference')}><Input value={littera} onChange={(e) => setLittera(e.target.value)} /></Fld>
            </Row>
            <Fld label={t('Address')}><Input value={orderAddress} onChange={(e) => setOrderAddress(e.target.value)} /></Fld>
          </>
        ) : (
          <Section
            id="order"
            title={t('Order')}
            {...sec}
            extra={(
              <Select
                className="order-sec__pick"
                value={null}
                onChange={(v) => setExistingId(v || null)}
                options={orderOptions}
                showSearch
                optionFilterProp="label"
                placeholder={t('Choose existing')}
                popupMatchSelectWidth={280}
              />
            )}
          >
            {existingOrder ? (
              <div className="order-quick__chosen">
                <span>{existingOrder.name}</span>
                <button type="button" aria-label={t('Remove')} onClick={() => setExistingId(null)}><CloseOutlined /></button>
              </div>
            ) : (
              <Row className="order-quick__head">
                <Fld label={t('Title')}><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Fld>
                <Fld label={t('Order reference')}><Input value={littera} onChange={(e) => setLittera(e.target.value)} /></Fld>
              </Row>
            )}
            {existingOrder ? null : (
              <Fld label={t('Address')}><Input value={orderAddress} onChange={(e) => setOrderAddress(e.target.value)} /></Fld>
            )}
          </Section>
        )}
        {editing ? (
          <Fld label={t('Status')}>
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} style={{ width: '100%' }} />
          </Fld>
        ) : null}

        {existingOrder ? null : (
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
              placeholder={t('Choose existing')}
              popupMatchSelectWidth={280}
            />
          )}
        >
          {chosen ? (
            <div className="order-quick__chosen">
              <span>{clientOptions.find((o) => o.value === String(clientId))?.label}</span>
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
            </>
          )}
        </Section>
        )}

        <Section id="time" title={t('Time')} {...sec}>
          <div className="order-quick__when">
            <Fld label={t('From')}>
              <DatePicker value={from} onChange={(v) => { setFrom(v); if (v && to && to.isBefore(v, 'day')) setTo(v); }} allowClear={false} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('Start time')}>
              <TimePicker value={asTime(start)} onChange={(v) => v && setStart(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </Fld>
          </div>
          <div className="order-quick__when">
            <Fld label={t('To')}>
              <DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} />
            </Fld>
            <Fld label={t('End time')}>
              <TimePicker value={asTime(end)} onChange={(v) => v && setEnd(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} style={{ width: '100%' }} />
            </Fld>
          </div>
          {multiDay ? (
            <Checkbox checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)}>{t('Weekdays only')}</Checkbox>
          ) : null}
        </Section>

        <Section
          id="staff"
          title={t('Staff')}
          {...sec}
          extra={(
            <Select
              className="order-sec__pick"
              value={null}
              onChange={(v) => v && setWorkerIds((w) => (w.includes(v) ? w : [...w, v]))}
              options={[...employees, ...extraEmployees].filter((o) => !workerIds.includes(o.value))}
              showSearch
              optionFilterProp="label"
              placeholder={t('Choose existing')}
              popupMatchSelectWidth={280}
            />
          )}
        >
          {workerIds.map((id) => (
            <div key={id} className="order-quick__row order-quick__row--pick">
              <span className="order-quick__name">{[...employees, ...extraEmployees].find((o) => o.value === id)?.label || '—'}</span>
              <button type="button" className="teammgr__del" aria-label={t('Remove')} onClick={() => setWorkerIds((w) => w.filter((x) => x !== id))}><DeleteOutlined /></button>
            </div>
          ))}
          <Row>
            <Fld label={t('Name')}><Input value={newEmp?.name || ''} onChange={(e) => setNewEmp((x) => ({ ...(x || {}), name: e.target.value }))} /></Fld>
            <Fld label={t('Email')}><Input value={newEmp?.email || ''} onChange={(e) => setNewEmp((x) => ({ ...(x || {}), email: e.target.value }))} /></Fld>
          </Row>
        </Section>

        <Section
          id="articles"
          title={t('Articles')}
          {...sec}
          extra={(
            <Select
              className="order-sec__pick"
              value={null}
              onChange={addArticle}
              options={articleOptions}
              showSearch
              optionFilterProp="label"
              placeholder={t('Choose existing')}
              popupMatchSelectWidth={280}
            />
          )}
        >
          {rows.map((r, i) => (
            <div key={`${r.articleId}-${i}`} className="order-quick__row">
              <span className="order-quick__name">{[r.articleNumber, r.name].filter(Boolean).join(' · ')}</span>
              <span className="order-quick__price">{kr(r.price)}</span>
              <button type="button" className="teammgr__del" aria-label={t('Remove')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><DeleteOutlined /></button>
            </div>
          ))}
        </Section>

        {existingOrder ? null : (
        <Section id="economy" title={t('Economy')} {...sec}>
          <Row>
            <Fld label={t('Budget (SEK)')}><InputNumber min={0} value={budget} onChange={setBudget} style={{ width: '100%' }} /></Fld>
            <Fld label={t('Bill rate / hour — billed (SEK)')}><InputNumber min={0} value={billRate} onChange={setBillRate} style={{ width: '100%' }} /></Fld>
          </Row>
        </Section>
        )}
      </div>
    </AdminModal>
  );
}
