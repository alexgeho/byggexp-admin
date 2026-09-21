'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Table, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { readBankSheet, classifyColumns } from '@/src/features/projektkalkyl/excelImport';

// Keep it focused: by default we surface only the columns a calc needs (date,
// description, amount — auto-detected), and hide the rest behind "Show N more".
// The × on a column drops it; column types are worked out automatically.
export default function BankImportModal({ open, file, t, tableTitle, expense = false, onCancel, onImport }) {
  const [sheet, setSheet] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [hiddenCols, setHiddenCols] = useState(() => new Set());

  useEffect(() => {
    if (!open || !file) return undefined;
    let cancelled = false;
    setLoading(true);
    readBankSheet(file)
      .then((s) => { if (!cancelled) { setSheet(s); setHiddenCols(new Set()); } })
      .catch(() => { if (!cancelled) message.error(t('Could not read the Excel file')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, file, t]);
  const hiddenCount = hiddenCols.size;

  const keptColumns = useMemo(
    () => classifyColumns(sheet.columns, sheet.rows, hiddenCols),
    [sheet.columns, sheet.rows, hiddenCols],
  );
  const rowCount = useMemo(
    () => sheet.rows.filter((r) => keptColumns.some((c) => String(r[c.index] ?? '').trim() !== '')).length,
    [sheet.rows, keptColumns],
  );
  const canImport = keptColumns.length > 0 && rowCount > 0;

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
      .map(({ c, ci }) => ({
        dataIndex: ci,
        key: ci,
        ellipsis: true,
        width: 160,
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
      })),
    [sheet.columns, hiddenCols, t],
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={() => canImport && onImport({ columns: keptColumns, rows: sheet.rows, expense })}
      okText={`${t('Import')}${rowCount ? ` (${rowCount})` : ''}`}
      okButtonProps={{ disabled: !canImport, loading }}
      cancelText={t('Cancel')}
      width="92%"
      style={{ maxWidth: 1200, top: 24 }}
      title={tableTitle ? `${t('Import bank file')} — ${tableTitle}` : t('Import bank file')}
      destroyOnHidden
    >
      <p style={{ color: '#687898', marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span>{t('Every column is imported. Click × on a column to drop it.')}</span>
        {hiddenCount > 0 ? (
          <button type="button" onClick={() => setHiddenCols(new Set())}
            style={{ background: 'transparent', border: 0, color: '#0785f4', fontWeight: 600, cursor: 'pointer', font: 'inherit', padding: 0 }}>
            {t('Show all columns')} ({hiddenCount})
          </button>
        ) : null}
      </p>
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
