import { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, TimePicker } from 'antd';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
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
const EMPTY_CLIENT = {
  clientType: 'private', firstName: '', lastName: '', companyName: '', orgNumber: '', contactPerson: '',
  phone: '', email: '', address: '', notes: '',
};
const EMPTY_EMP = { name: '', phone: '', email: '' };

// Section = a title on a line (like «Fakturarader»), fields below in a 50/50 grid.
const Section = ({ title, children }) => (
  <section className="order-sec">
    <div className="order-sec__title"><span>{title}</span></div>
    <div className="order-grid">{children}</div>
  </section>
);
const Fld = ({ label, children, className = '' }) => (
  <label className={`order-fld ${className}`}><span>{label}</span>{children}</label>
);

// Swedish phone "070-123 45 67" → area code + number, as the user form stores it.
const splitPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length <= 2) return {};
  return { phoneAreaCode: parseInt(digits.slice(0, 2), 10), phoneNumber: parseInt(digits.slice(2), 10) };
};

// «Ny bokning» from the calendar (owner-approved mockup ny-bokning.png, 2026-11-12):
// Arbetsorder (Artikel → Beskrivning, Lägg till i befintlig order, Orderreferens),
// Kund (new by default, existing on the right; address belongs to the client),
// Tid (Från | Till), Personal (new on the left, existing on the right, comment,
// task with reminders). Every field 50% wide, a label above every field.
export default function OrderQuickModal({ open, initial, employees, orders = [], onEmployeeAdded, onCancel, onSave, onDelete, deleteLabel }) {
  const t = useT();
  const me = useAuthStore((st) => st.user);
  const editing = !!initial?.projectId;
  const [title, setTitle] = useState('');
  const [littera, setLittera] = useState('');
  const [status, setStatus] = useState('planning');
  const [managerId, setManagerId] = useState(undefined);
  const [clientId, setClientId] = useState(null);
  const [existingId, setExistingId] = useState(null); // add this booking to an existing order
  const [nc, setNc] = useState(EMPTY_CLIENT);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('10:00');
  const [workerIds, setWorkerIds] = useState([]);
  const [note, setNote] = useState('');
  const [rows, setRows] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newEmp, setNewEmp] = useState(EMPTY_EMP);

  useEffect(() => {
    if (!open) return;
    const p = initial?.project || {};
    setTitle(initial?.title || '');
    setLittera(editing ? (p.littera || '') : '');
    setStatus(editing ? (p.status || 'planning') : 'planning');
    setManagerId(editing ? (p.projectManagerId?._id || p.projectManagerId || undefined) : (me?._id || me?.id || undefined));
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
    setNote(initial?.note || '');
    setRows(initial?.rows || []);
    setNewEmp(EMPTY_EMP);
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
    () => clients.map((c) => ({ value: String(c._id), label: getClientDisplayName(c) })),
    [clients],
  );
  const chosen = clientId ? clients.find((c) => String(c._id) === String(clientId)) : null;
  const orderOptions = useMemo(
    () => orders.map((p) => ({ value: String(p._id || p.id), label: p.name || '—' })),
    [orders],
  );
  const existingOrder = existingId ? orders.find((p) => String(p._id || p.id) === String(existingId)) : null;
  const setC = (k) => (v) => setNc((c) => ({ ...c, [k]: v?.target ? v.target.value : v }));
  const setE = (k) => (e) => setNewEmp((x) => ({ ...x, [k]: e.target.value }));

  // One article per booking; its name goes into Beskrivning (can be edited after).
  const articleId = rows[0]?.articleId;
  const pickArticle = (id) => {
    const a = articles.find((x) => String(x._id) === String(id));
    if (!a) { setRows((rs) => rs.slice(1)); return; }
    const row = {
      articleId: String(a._id), articleNumber: a.articleNumber || '', name: a.name || '',
      unit: a.unit || 'st', quantity: 1, price: Number(a.priceExclMoms) || 0,
    };
    setRows((rs) => [row, ...rs.slice(1)]);
    if (a.name) setTitle(a.name);
  };

  // Keep the duration when the start moves (Google Calendar behaviour).
  const changeFrom = (v) => {
    if (!v) return;
    const d = v.diff(from, 'day');
    setFrom(v);
    setTo((tt) => (tt ? tt.add(d, 'day') : v));
  };
  const changeStart = (hhmm) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const dur = (h2 * 60 + m2) - (h1 * 60 + m1);
    setStart(hhmm);
    const [h, m] = hhmm.split(':').map(Number);
    const e = Math.min(23 * 60 + 45, h * 60 + m + Math.max(dur, 15));
    setEnd(`${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`);
  };

  const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const hours = Math.max(0, (minutes(end) - minutes(start)) / 60);
  const multiDay = !!(from && to && to.isAfter(from, 'day'));
  const invalid = (!existingId && !title.trim()) || !from || !to || to.isBefore(from, 'day') || hours <= 0 || saving;
  const clientHasName = nc.clientType === 'private' ? `${nc.firstName}${nc.lastName}`.trim() : nc.companyName.trim();

  // Quick-add a worker without leaving the window (invite e-mail goes out as usual).
  const addEmployee = async () => {
    try {
      const { data } = await apiClient.post('/users', {
        name: newEmp.name.trim(),
        email: newEmp.email.trim(),
        role: 'worker',
        inviteViaEmail: true,
        ...splitPhone(newEmp.phone),
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

  // Task with reminders: our quick-task capture, tied to the order when there is one.
  const openTask = () => {
    const projectId = initial?.projectId || existingId || undefined;
    window.dispatchEvent(new CustomEvent('quicktask:open', { detail: { projectId } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      let ids = workerIds;
      if (newEmp.name.trim() && /\S+@\S+\.\S+/.test(newEmp.email)) {
        const id = await addEmployee();
        if (id) ids = [...ids, id];
      }
      const days = Math.max(1, to.diff(from, 'day') + 1);
      const newClient = !existingId && !clientId && clientHasName ? nc : null;
      const address = (newClient ? nc.address : chosen?.address) || initial?.address || '';
      await onSave({
        existingId,
        title: existingOrder ? existingOrder.name : title.trim(),
        order: {
          littera: littera.trim(),
          ...(editing ? { status } : {}),
          projectManagerId: managerId,
          plannedHours: Math.round(hours * days * 10) / 10,
        },
        clientId: clientId || null,
        newClient,
        address: address.trim(),
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        weekdaysOnly: multiDay ? weekdaysOnly : false,
        start,
        hours,
        workerIds: ids,
        note: note.trim(),
        rows,
      });
    } finally {
      setSaving(false);
    }
  };

  const staffOptions = employees;
  const showClient = !existingOrder;

  return (
    <AdminModal
      open={open}
      title={editing ? (initial?.title || t('Work order')) : t('New booking')}
      onCancel={onCancel}
      maskClosable={false}
      width={920}
      footer={[
        ...(editing && onDelete ? [<Button key="del" variant="secondary" danger onClick={onDelete}>{deleteLabel || t('Delete')}</Button>] : []),
        <Button key="cancel" variant="secondary" onClick={onCancel}>{t('Cancel')}</Button>,
        <Button key="save" variant="primary" disabled={invalid} loading={saving} onClick={save}>{editing ? t('Save') : t('Create')}</Button>,
      ]}
    >
      <div className="order-quick admin-modal-form" onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !invalid) { e.preventDefault(); save(); } }}>
        <Section title={t('Work order')}>
          <Fld label={t('Article')}>
            <Select value={articleId} onChange={pickArticle} allowClear options={articleOptions} disabled={!!existingOrder} />
          </Fld>
          {editing ? (
            <Fld label={t('Status')}>
              <Select value={status} onChange={setStatus} options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
            </Fld>
          ) : (
            <Fld label={t('Add to existing order')}>
              <Select
                value={existingId ? String(existingId) : undefined}
                onChange={(v) => setExistingId(v ?? null)}
                allowClear
                options={orderOptions}
              />
            </Fld>
          )}
          {existingOrder ? null : (
            <>
              <Fld label={t('Description')}><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!editing} /></Fld>
              <Fld label={t('Order reference')}><Input value={littera} onChange={(e) => setLittera(e.target.value)} /></Fld>
            </>
          )}
        </Section>

        {showClient ? (
          <Section title={t('Client')}>
            <Fld label={t('Type')}>
              <Segmented
                value={nc.clientType}
                onChange={setC('clientType')}
                disabled={!!chosen}
                options={[{ value: 'private', label: t('Private person') }, { value: 'company', label: t('Company') }]}
              />
            </Fld>
            <Fld label={t('Choose existing client')}>
              <Select value={clientId ? String(clientId) : undefined} onChange={(v) => setClientId(v ?? null)} allowClear options={clientOptions} />
            </Fld>
            {chosen ? null : (
              <>
                {nc.clientType === 'private' ? (
                  <>
                    <Fld label={t('First name')}><Input value={nc.firstName} onChange={setC('firstName')} /></Fld>
                    <Fld label={t('Last name')}><Input value={nc.lastName} onChange={setC('lastName')} /></Fld>
                  </>
                ) : (
                  <>
                    <Fld label={t('Company name')}><Input value={nc.companyName} onChange={setC('companyName')} /></Fld>
                    <Fld label={t('Org no.')}><Input value={nc.orgNumber} onChange={setC('orgNumber')} /></Fld>
                    <Fld label={t('Contact person')}><Input value={nc.contactPerson} onChange={setC('contactPerson')} /></Fld>
                    <Fld label={t('Phone')}><Input value={nc.phone} onChange={setC('phone')} /></Fld>
                  </>
                )}
                {nc.clientType === 'private' ? (
                  <Fld label={t('Phone')}><Input value={nc.phone} onChange={setC('phone')} /></Fld>
                ) : null}
                <Fld label={t('Email')}><Input value={nc.email} onChange={setC('email')} /></Fld>
                <Fld label={t('Address')}><Input value={nc.address} onChange={setC('address')} /></Fld>
                <Fld label={t('Comment')}><Input value={nc.notes} onChange={setC('notes')} /></Fld>
              </>
            )}
          </Section>
        ) : null}

        <Section title={t('Time')}>
          <Fld label={t('From')}>
            <div className="order-pair">
              <DatePicker value={from} onChange={changeFrom} allowClear={false} />
              <TimePicker value={asTime(start)} onChange={(v) => v && changeStart(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} />
            </div>
          </Fld>
          <Fld label={t('To')}>
            <div className="order-pair">
              <DatePicker value={to} onChange={setTo} allowClear={false} />
              <TimePicker value={asTime(end)} onChange={(v) => v && setEnd(v.format('HH:mm'))} format="HH:mm" minuteStep={15} allowClear={false} needConfirm={false} />
            </div>
          </Fld>
          {multiDay ? (
            <Checkbox checked={weekdaysOnly} onChange={(e) => setWeekdaysOnly(e.target.checked)}>{t('Weekdays only')}</Checkbox>
          ) : null}
        </Section>

        <Section title={t('Staff')}>
          <Fld label={t('Name')}><Input value={newEmp.name} onChange={setE('name')} /></Fld>
          <Fld label={t('Choose existing staff')}>
            <Select
              mode="multiple"
              value={workerIds}
              onChange={setWorkerIds}
              menuItemSelectedIcon={<CheckOutlined />}
              options={staffOptions}
            />
          </Fld>
          <Fld label={t('Phone')}><Input value={newEmp.phone} onChange={setE('phone')} /></Fld>
          <Fld label={t('Comment')}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Fld>
          <Fld label={t('Email')}><Input value={newEmp.email} onChange={setE('email')} /></Fld>
          <div className="order-fld">
            <span aria-hidden="true">&nbsp;</span>
            <button type="button" className="order-task-btn" onClick={openTask}>
              <PlusOutlined /> {t('Task with reminders')}
            </button>
          </div>
        </Section>
      </div>
    </AdminModal>
  );
}
