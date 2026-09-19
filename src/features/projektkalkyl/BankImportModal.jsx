'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Select, Table, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { readBankSheet, buildBankRows } from '@/src/features/projektkalkyl/excelImport';

// Wide bank import: pick which column is the Date / Description / Amount up top,
// see the whole file, and × out columns you don't need. Only the mapped columns
// are imported.
export default function BankImportModal({ open, file, t, tableTitle, expense = false, onCancel, onImport }) {
  const [sheet, setSheet] = useState({ columns: [], rows: [], guess: {} });
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState({ dateI: -1, descI: -1, amtI: -1 });
  const [hiddenCols, setHiddenCols] = useState(() => new Set());

  useEffect(() => {
    if (!open || !file) return undefined;
    let cancelled = false;
    setLoading(true);
    readBankSheet(file)
      .then((s) => {
        if (cancelled) return;
        setSheet(s);
        setHiddenCols(new Set());
        const g = s.guess || {};
        setMap({ dateI: g.dateI ?? -1, descI: g.descI ?? -1, amtI: g.amtI ?? -1 });
      })
      .catch(() => { if (!cancelled) message.error(t('Could not read the Excel file')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, file, t]);

  const colOptions = useMemo(
    () => [{ value: -1, label: `— ${t('None')} —` }, ...sheet.columns.map((c, i) => ({ value: i, label: c }))],
    [sheet.columns, t],
  );

  const mapping = useMemo(() => ({ ...map, mode: 'single', expense }), [map, expense]);
  const parsed = useMemo(() => buildBankRows(sheet.rows, mapping), [sheet.rows, mapping]);
  const canImport = parsed.length > 0 && map.amtI >= 0;

  const mappedIdx = useMemo(
    () => new Set([map.dateI, map.descI, map.amtI].filter((i) => i >= 0)),
    [map],
  );

  const previewRows = useMemo(
    () => sheet.rows.slice(0, 40).map((r, i) => {
      const o = { key: i };
      sheet.columns.forEach((_, ci) => { o[ci] = r[ci] instanceof Date ? r[ci].toISOString().slice(0, 10) : r[ci]; });
      return o;
    }),
    [sheet.rows, sheet.columns],
  );

  const previewCols = useMemo(
    () => sheet.columns
      .map((c, ci) => ({ c, ci }))
      .filter(({ ci }) => !hiddenCols.has(ci))
      .map(({ c, ci }) => {
        const isMapped = mappedIdx.has(ci);
        return {
          dataIndex: ci,
          key: ci,
          ellipsis: true,
          width: 150,
          onHeaderCell: () => ({ style: isMapped ? { background: 'rgba(7,133,244,0.12)' } : undefined }),
          onCell: () => ({ style: isMapped ? { background: 'rgba(7,133,244,0.06)' } : undefined }),
          title: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
              <CloseOutlined
                title={t('Hide column')}
                onClick={() => setHiddenCols((prev) => new Set(prev).add(ci))}
                style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 11, flexShrink: 0 }}
              />
            </span>
          ),
        };
      }),
    [sheet.columns, hiddenCols, mappedIdx, t],
  );

  const field = (label, value, onChange) => (
    <div style={{ flex: '1 1 200px', minWidth: 180 }}>
      <div className="planning-field-label">{label}</div>
      <Select size="small" value={value} onChange={onChange} options={colOptions} style={{ width: '100%' }} />
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={() => canImport && onImport(parsed)}
      okText={`${t('Import')}${parsed.length ? ` (${parsed.length})` : ''}`}
      okButtonProps={{ disabled: !canImport, loading }}
      cancelText={t('Cancel')}
      width="92%"
      style={{ maxWidth: 1200, top: 24 }}
      title={tableTitle ? `${t('Import bank file')} — ${tableTitle}` : t('Import bank file')}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        {field(t('Date'), map.dateI, (v) => setMap((m) => ({ ...m, dateI: v })))}
        {field(t('Description'), map.descI, (v) => setMap((m) => ({ ...m, descI: v })))}
        {field(t('Amount'), map.amtI, (v) => setMap((m) => ({ ...m, amtI: v })))}
      </div>
      <Table
        size="small"
        columns={previewCols}
        dataSource={previewRows}
        pagination={false}
        loading={loading}
        scroll={{ x: 'max-content', y: 440 }}
        locale={{ emptyText: t('No rows found in the file') }}
      />
    </Modal>
  );
}
