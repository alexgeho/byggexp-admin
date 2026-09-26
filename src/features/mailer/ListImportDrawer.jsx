'use client';

import { useMemo, useState } from 'react';
import { Alert, Button, Drawer, Input, Progress, Select, Table, Tabs, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import * as XLSX from '@e965/xlsx';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { apiError, mailerApi } from './mailerApi';

const FIELDS = ['email', 'name', 'company', 'city'];
const FIELD_LABELS = { email: 'Email', name: 'Name', company: 'Company', city: 'City' };

// Header names we recognise (sv/en/ru) so mapping is usually automatic.
const GUESS = {
  email: /^(e-?post|e-?mail|email|mail|epostadress|почта)$/i,
  name: /^(namn|name|kontakt|kontaktperson|förnamn|имя)$/i,
  company: /^(företag|foretag|company|bolag|firma|företagsnamn|компания)$/i,
  city: /^(ort|stad|city|kommun|sokstad|город)$/i,
};
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHUNK = 1000;

function sheetToRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
}

// First row is a header unless it already looks like data (has an email).
function toTable(matrix) {
  const rows = matrix.filter((r) => r.some((c) => String(c).trim()));
  if (!rows.length) return { headers: [], data: [] };
  const hasHeader = !rows[0].some((c) => EMAIL_LIKE.test(String(c).trim()));
  const width = Math.max(...rows.map((r) => r.length));
  const headers = hasHeader
    ? Array.from({ length: width }, (_, i) => String(rows[0][i] ?? '').trim() || `Kolumn ${i + 1}`)
    : Array.from({ length: width }, (_, i) => `Kolumn ${i + 1}`);
  return { headers, data: hasHeader ? rows.slice(1) : rows };
}

function guessMapping(headers, data) {
  const map = {};
  headers.forEach((h, i) => {
    for (const f of FIELDS) if (!(f in map) && GUESS[f].test(h.trim())) map[f] = i;
  });
  if (!('email' in map)) {
    // Pick the column where most cells look like addresses.
    const scores = headers.map((_, i) => data.slice(0, 50).filter((r) => EMAIL_LIKE.test(String(r[i] ?? '').trim())).length);
    const best = scores.indexOf(Math.max(...scores));
    if (scores[best] > 0) map.email = best;
  }
  return map;
}

export default function ListImportDrawer({ list, open, onClose, onDone }) {
  const t = useT();
  const [table, setTable] = useState({ headers: [], data: [] });
  const [mapping, setMapping] = useState({});
  const [pasted, setPasted] = useState('');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setTable({ headers: [], data: [] });
    setMapping({});
    setPasted('');
    setProgress(null);
    setResult(null);
  };

  const load = (matrix) => {
    const tb = toTable(matrix);
    setTable(tb);
    setMapping(guessMapping(tb.headers, tb.data));
    setResult(null);
  };

  const readFile = async (file) => {
    try {
      const buf = await file.arrayBuffer();
      if (/\.(csv|txt)$/i.test(file.name)) {
        // Decode text ourselves: UTF-8, or Windows-1252 for CSVs saved by a
        // Swedish Excel — otherwise "Företag"/"Ort" headers arrive garbled.
        let text = new TextDecoder('utf-8').decode(buf);
        if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buf);
        load(sheetToRows(XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string' })));
      } else {
        load(sheetToRows(XLSX.read(buf, { type: 'array' })));
      }
    } catch {
      appMessage.error(t('Could not read the file'));
    }
    return false; // stop antd's own upload
  };

  const usePasted = () => {
    // One address per line, or CSV/TSV lines.
    const matrix = pasted.split(/\r?\n/).map((line) => line.split(/[;\t,]/).map((c) => c.trim()));
    load(matrix);
  };

  const rows = useMemo(
    () => table.data.map((r) => Object.fromEntries(
      FIELDS.filter((f) => f in mapping).map((f) => [f, String(r[mapping[f]] ?? '').trim()]),
    )),
    [table, mapping],
  );

  const runImport = async () => {
    if (!('email' in mapping)) {
      appMessage.error(t('Choose which column contains the email address'));
      return;
    }
    const total = { added: 0, alreadyInList: 0, invalid: 0, duplicates: 0, suppressed: 0 };
    setProgress(0);
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const r = await mailerApi.importRows(list._id, rows.slice(i, i + CHUNK));
        Object.keys(total).forEach((k) => { total[k] += r[k] || 0; });
        setProgress(Math.round(((i + CHUNK) / rows.length) * 100));
      }
      setResult(total);
      onDone?.();
    } catch (err) {
      appMessage.error(apiError(err, t('Import failed')));
    } finally {
      setProgress(null);
    }
  };

  const columns = FIELDS.filter((f) => f in mapping).map((f) => ({ title: t(FIELD_LABELS[f]), dataIndex: f, key: f, ellipsis: true }));

  return (
    <Drawer
      title={`${t('Import subscribers')} → ${list?.name || ''}`}
      open={open}
      width={720}
      onClose={() => { reset(); onClose(); }}
      destroyOnHidden
      extra={table.data.length && !result ? (
        <Button type="primary" onClick={runImport} loading={progress !== null}>
          {t('Import {x} rows').replace('{x}', table.data.length)}
        </Button>
      ) : null}
    >
      {result ? (
        <Alert
          type="success"
          showIcon
          message={t('Import finished')}
          description={(
            <ul className="mailer-import__result">
              <li>{t('Added')}: <b>{result.added}</b></li>
              <li>{t('Already in the list (updated)')}: <b>{result.alreadyInList}</b></li>
              <li>{t('Duplicates in the file')}: <b>{result.duplicates}</b></li>
              <li>{t('Invalid addresses (skipped)')}: <b>{result.invalid}</b></li>
              <li>{t('Previously unsubscribed/bounced (will not be mailed)')}: <b>{result.suppressed}</b></li>
            </ul>
          )}
          action={<Button onClick={reset}>{t('Import more')}</Button>}
        />
      ) : null}

      {!table.data.length && !result ? (
        <Tabs
          items={[
            {
              key: 'file',
              label: t('File (CSV / Excel)'),
              children: (
                <>
                  <Upload.Dragger accept=".csv,.txt,.xlsx,.xls" showUploadList={false} beforeUpload={readFile}>
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">{t('Drop a CSV or Excel file here, or click to choose')}</p>
                    <p className="ant-upload-hint">{t('One row per recipient. Columns: email (required), name, company, city.')}</p>
                  </Upload.Dragger>
                </>
              ),
            },
            {
              key: 'paste',
              label: t('Paste addresses'),
              children: (
                <>
                  <Input.TextArea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    autoSize={{ minRows: 8, maxRows: 16 }}
                    placeholder={'info@foretag.se\nanna@bygg.se;Anna;Bygg AB;Stockholm'}
                  />
                  <Button style={{ marginTop: 8 }} onClick={usePasted} disabled={!pasted.trim()}>{t('Continue')}</Button>
                </>
              ),
            },
          ]}
        />
      ) : null}

      {table.data.length && !result ? (
        <>
          <h4 className="mailer-import__h">{t('Which column is what?')}</h4>
          <div className="mailer-import__map">
            {FIELDS.map((f) => (
              <label key={f}>
                <span>{t(FIELD_LABELS[f])}{f === 'email' ? ' *' : ''}</span>
                <Select
                  allowClear={f !== 'email'}
                  value={mapping[f]}
                  placeholder={t('— not imported —')}
                  onChange={(v) => setMapping((m) => {
                    const next = { ...m };
                    if (v === undefined) delete next[f];
                    else next[f] = v;
                    return next;
                  })}
                  options={table.headers.map((h, i) => ({ value: i, label: h }))}
                />
              </label>
            ))}
          </div>
          <h4 className="mailer-import__h">{t('Preview')} ({t('{x} rows').replace('{x}', table.data.length)})</h4>
          <Table size="small" rowKey={(_, i) => i} columns={columns} dataSource={rows.slice(0, 8)} pagination={false} />
          {progress !== null ? <Progress percent={Math.min(100, progress)} style={{ marginTop: 12 }} /> : null}
          <Button type="link" onClick={reset} style={{ paddingLeft: 0, marginTop: 8 }}>{t('Choose another file')}</Button>
        </>
      ) : null}
    </Drawer>
  );
}
