import { useMemo, useRef, useState } from 'react';
import { Modal, Table, Tag, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { useUserStore } from '@/src/store/userStore';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';

const TEMPLATE_HEADERS = ['name', 'email', 'role', 'phoneAreaCode', 'phoneNumber', 'profession'];
const TEMPLATE_SAMPLE = [
  ['Anna Andersson', 'anna@example.com', 'worker', '46', '701234567', 'Snickare'],
  ['Erik Eriksson', 'erik@example.com', 'projectAdmin', '46', '709876543', 'Platschef'],
];
const VALID_ROLES = ['worker', 'projectAdmin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas,
// escaped quotes ("") and both \n and \r\n line endings.
function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else { field += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length || row.length) pushRow();
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

function toNumberOrUndefined(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : undefined;
}

// Map parsed CSV rows (with a header row) into validated import records.
function buildRecords(matrix) {
  if (!matrix.length) return [];
  const header = matrix[0].map((h) => String(h).trim().toLowerCase());
  const idx = (name) => header.indexOf(name.toLowerCase());
  const col = { name: idx('name'), email: idx('email'), role: idx('role'), area: idx('phoneAreaCode'), phone: idx('phoneNumber'), profession: idx('profession') };

  return matrix.slice(1).map((cells, i) => {
    const get = (c) => (c >= 0 ? String(cells[c] ?? '').trim() : '');
    const email = get(col.email).toLowerCase();
    let role = get(col.role) || 'worker';
    const errors = [];
    if (!email) errors.push('Email is required');
    else if (!EMAIL_RE.test(email)) errors.push('Invalid email');
    if (!VALID_ROLES.includes(role)) { errors.push('Role must be worker or projectAdmin'); role = 'worker'; }

    return {
      key: i,
      line: i + 2, // +1 header, +1 for 1-based
      name: get(col.name),
      email,
      role,
      phoneAreaCode: get(col.area),
      phoneNumber: get(col.phone),
      profession: get(col.profession),
      errors,
    };
  });
}

export default function UserBulkImport({ open, onClose, onDone }) {
  const t = useT();
  const bulkCreate = useUserStore((state) => state.bulkCreate);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [records, setRecords] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const validRecords = useMemo(() => records.filter((r) => r.errors.length === 0), [records]);
  const invalidCount = records.length - validRecords.length;
  // Duplicate emails within the file are only detectable up front.
  const dupEmails = useMemo(() => {
    const seen = new Map();
    validRecords.forEach((r) => seen.set(r.email, (seen.get(r.email) || 0) + 1));
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([e]) => e));
  }, [validRecords]);

  const reset = () => { setFileName(''); setRecords([]); setResult(null); };

  const handleClose = () => { reset(); onClose?.(); };

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(','), ...TEMPLATE_SAMPLE.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setResult(null);
    try {
      const text = await file.text();
      const parsed = buildRecords(parseCsv(text));
      if (!parsed.length) { message.error(t('No rows found in the file')); return; }
      setFileName(file.name);
      setRecords(parsed);
    } catch {
      message.error(t('Could not read the file'));
    }
  };

  const handleImport = async () => {
    const toSend = validRecords.map((r) => ({
      name: r.name || undefined,
      email: r.email,
      role: r.role,
      phoneAreaCode: toNumberOrUndefined(r.phoneAreaCode),
      phoneNumber: toNumberOrUndefined(r.phoneNumber),
      profession: r.profession || undefined,
      inviteViaEmail: true,
    }));
    if (!toSend.length) { message.warning(t('No valid rows to import')); return; }

    setSubmitting(true);
    try {
      const res = await bulkCreate(toSend);
      setResult(res);
      if (res.created > 0) message.success(`${res.created} user(s) invited`);
      onDone?.();
    } catch (err) {
      message.error(formatApiError(err, 'Bulk import failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: t('Line'), dataIndex: 'line', width: 60 },
    { title: t('Name'), dataIndex: 'name', render: (v) => v || <span style={{ color: '#94a3b8' }}>—</span> },
    { title: t('Email'), dataIndex: 'email' },
    { title: t('Role'), dataIndex: 'role', width: 120, render: (v) => <Tag className="pill-tag">{v}</Tag> },
    {
      title: t('Status'),
      key: 'status',
      width: 220,
      render: (_, r) => {
        if (r.errors.length) return <Tag color="red">{r.errors.join(', ')}</Tag>;
        if (dupEmails.has(r.email)) return <Tag color="orange">{t('Duplicate email in file')}</Tag>;
        return <Tag color="green">{t('Ready')}</Tag>;
      },
    },
  ];

  return (
    <Modal
      title={t('Import users from CSV')}
      open={open}
      onCancel={handleClose}
      width={860}
      destroyOnHidden
      footer={[
        <Button key="tmpl" variant="secondary" icon={<DownloadOutlined />} onClick={downloadTemplate}>
          {t('Download template')}
        </Button>,
        <Button
          key="import"
          onClick={handleImport}
          disabled={!validRecords.length || submitting}
          loading={submitting}
        >
          {t('Import {n} users').replace('{n}', validRecords.length)}
        </Button>,
      ]}
    >
      <p style={{ color: 'var(--muted, #64748b)', marginTop: 0 }}>
        {t('Upload a CSV with columns')} <b>{TEMPLATE_HEADERS.join(', ')}</b>. {t('Each imported user gets an email invite to set their own password.')} {t('Roles:')} <b>worker</b> {t('or')} <b>projectAdmin</b>.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
        <Button variant="secondary" icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
          {fileName ? t('Choose another file') : t('Upload CSV')}
        </Button>
        {fileName ? <span style={{ color: 'var(--muted, #64748b)' }}>{fileName}</span> : null}
      </div>

      {records.length ? (
        <>
          <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted, #64748b)' }}>
            {validRecords.length} {t('ready')}
            {invalidCount ? ` · ${invalidCount} ${t('with errors (skipped)')}` : ''}
            {dupEmails.size ? ` · ${dupEmails.size} ${t('duplicate email(s) in file')}` : ''}
          </div>
          <Table
            size="small"
            columns={columns}
            dataSource={records}
            pagination={records.length > 8 ? { pageSize: 8 } : false}
            scroll={{ y: 320 }}
          />
        </>
      ) : null}

      {result ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 6px' }}>
            <b>{result.created}</b> {t('invited')}
            {result.failed?.length ? ` · ${result.failed.length} ${t('failed')}` : ''}.
          </p>
          {result.failed?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: '#b91c1c', fontSize: 13 }}>
              {result.failed.map((f) => (
                <li key={f.index}>{f.email || `row ${f.index + 1}`}: {f.reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
