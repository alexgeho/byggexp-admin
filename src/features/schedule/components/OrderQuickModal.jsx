import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, DatePicker, TimePicker } from 'antd';
import {
  CheckOutlined, CloseOutlined, DownOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined, FileWordOutlined, PaperClipOutlined, PlusOutlined,
} from '@ant-design/icons';
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
// The title has one arrow on the left: click folds the section (owner 12.11).
const Section = ({ title, open = true, onToggle, children }) => (
  <section className={`order-sec${open ? ' is-open' : ''}`}>
    <button type="button" className="order-sec__title" onClick={onToggle} aria-expanded={open}>
      <span><DownOutlined className="order-sec__chev" />{title}</span>
    </button>
    {open ? <div className="order-grid">{children}</div> : null}
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
  const [folded, setFolded] = useState([]);
  const [files, setFiles] = useState([]); // documents / photos attached to the order (owner 12.11)
  const fileRef = useRef(null);
  const fileUrls = useMemo(() => files.map((f) => (f.type?.startsWith('image/') ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => fileUrls.forEach((u) => u && URL.revokeObjectURL(u)), [fileUrls]);
  const sec = (id) => ({ open: !folded.includes(id), onToggle: () => setFolded((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])) });

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
    setFolded([]);
    setFiles([]);
    setSaving(false);
    // Always open at the top (owner 12.11) — the modal keeps its scroll between openings otherwise.
    setTimeout(() => document.querySelector('.order-quick')?.closest('.admin-modal__body-inner')?.scrollTo(0, 0), 60);
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
    const due = from ? `${from.format('YYYY-MM-DD')}T${start}` : undefined;
    window.dispatchEvent(new CustomEvent('quicktask:open', { detail: { projectId, fromBooking: true, due, people: employees, crew: workerIds } }));
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
        files,
      });
    } finally {
      setSaving(false);
    }
  };

  const staffOptions = employees;
  // Existing order chosen: nothing disappears — its own data is shown, greyed, read-only (owner 12.11).
  // Artikel stays selectable: the chosen article is added to that order (owner 12.11).
  const ro = !!existingOrder;
  const orderClientId = ro ? String(existingOrder.clientId?._id || existingOrder.clientId || '') : '';
  const orderClient = ro ? clients.find((c) => String(c._id) === orderClientId) : null;
  // Existing client (or the order's client): the same fields stay, filled with the client's data, read-only (owner 12.11).
  const shownClient = ro ? orderClient : chosen;
  const lockClient = ro || !!chosen;
  const cv = lockClient ? { ...EMPTY_CLIENT, ...(shownClient || {}), notes: shownClient?.notes || '' } : nc;
  const roVal = (v) => (v == null ? '' : String(v));

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
        <Section title={t('Work order')} {...sec('order')}>
          <Fld label={t('Article')}>
            <Select value={articleId} onChange={pickArticle} allowClear options={articleOptions} />
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
          <Fld label={t('Description')}><Input value={ro ? roVal(existingOrder.name) : title} onChange={(e) => setTitle(e.target.value)} disabled={ro} autoFocus={!editing} /></Fld>
          <Fld label={t('Order reference')}><Input value={ro ? roVal(existingOrder.littera) : littera} onChange={(e) => setLittera(e.target.value)} disabled={ro} /></Fld>
          <div className="order-fld">
            <span>{t('Documents and photos')}</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              hidden
              onChange={(e) => { const picked = [...(e.target.files || [])]; setFiles((f) => [...f, ...picked]); e.target.value = ''; }}
            />
            <button type="button" className="order-task-btn" onClick={() => fileRef.current?.click()}>
              <PaperClipOutlined /> {t('Attach files')}
            </button>
            {/* Every attached file as a 72px tile: photos as thumbnails, documents as type icon + name (owner 12.11). */}
            {files.length ? (
              <div className="order-thumbs">
                {files.map((f, i) => {
                  const ext = (f.name.split('.').pop() || '').toLowerCase();
                  const DocIcon = ext === 'pdf' ? FilePdfOutlined
                    : ['xls', 'xlsx', 'csv'].includes(ext) ? FileExcelOutlined
                      : ['doc', 'docx'].includes(ext) ? FileWordOutlined : FileTextOutlined;
                  return (
                    <div key={`${f.name}-${i}`} className={`order-thumb${fileUrls[i] ? '' : ` order-thumb--doc order-thumb--ext-${ext}`}`} title={f.name}>
                      {fileUrls[i] ? <img src={fileUrls[i]} alt={f.name} /> : (
                        <>
                          <DocIcon className="order-thumb__icon" />
                          <span className="order-thumb__name">{f.name}</span>
                        </>
                      )}
                      <button type="button" aria-label={t('Remove')} onClick={() => setFiles((xs) => xs.filter((_, j) => j !== i))}><CloseOutlined /></button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          {/* Same task button next to the documents too (owner 12.11). */}
          <div className="order-fld">
            <span aria-hidden="true">&nbsp;</span>
            <button type="button" className="order-task-btn" onClick={openTask}>
              <PlusOutlined /> {t('Task with reminders')}
            </button>
          </div>
        </Section>

        <Section title={t('Client')} {...sec('client')}>
          <Fld label={t('Type')}>
            <Segmented
              value={cv.clientType || 'private'}
              onChange={setC('clientType')}
              disabled={lockClient}
              options={[{ value: 'private', label: t('Private person') }, { value: 'company', label: t('Company') }]}
            />
          </Fld>
          <Fld label={t('Choose existing client')}>
            <Select value={ro ? (orderClientId || undefined) : (clientId ? String(clientId) : undefined)} onChange={(v) => setClientId(v ?? null)} allowClear options={clientOptions} disabled={ro} />
          </Fld>
          {(cv.clientType || 'private') === 'private' ? (
            <>
              <Fld label={t('First name')}><Input value={roVal(cv.firstName)} onChange={setC('firstName')} disabled={lockClient} /></Fld>
              <Fld label={t('Last name')}><Input value={roVal(cv.lastName)} onChange={setC('lastName')} disabled={lockClient} /></Fld>
            </>
          ) : (
            <>
              <Fld label={t('Company name')}><Input value={roVal(cv.companyName)} onChange={setC('companyName')} disabled={lockClient} /></Fld>
              <Fld label={t('Org no.')}><Input value={roVal(cv.orgNumber)} onChange={setC('orgNumber')} disabled={lockClient} /></Fld>
              <Fld label={t('Contact person')}><Input value={roVal(cv.contactPerson)} onChange={setC('contactPerson')} disabled={lockClient} /></Fld>
              <Fld label={t('Phone')}><Input value={roVal(cv.phone)} onChange={setC('phone')} disabled={lockClient} /></Fld>
            </>
          )}
          {(cv.clientType || 'private') === 'private' ? (
            <Fld label={t('Phone')}><Input value={roVal(cv.phone)} onChange={setC('phone')} disabled={lockClient} /></Fld>
          ) : null}
          <Fld label={t('Email')}><Input value={roVal(cv.email)} onChange={setC('email')} disabled={lockClient} /></Fld>
          <Fld label={t('Address')}><Input value={roVal(cv.address)} onChange={setC('address')} disabled={lockClient} /></Fld>
          <Fld label={t('Comment')}><Input value={roVal(cv.notes)} onChange={setC('notes')} disabled={lockClient} /></Fld>
        </Section>

        <Section title={t('Time')} {...sec('time')}>
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

        <Section title={t('Staff')} {...sec('staff')}>
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
