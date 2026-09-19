'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Table, message } from 'antd';
import { readBankSheet, buildBankRows } from '@/src/features/projektkalkyl/excelImport';

// Dead-simple bank import: show the file wide, and let the user tag which column
// is the Date / Description / Amount by clicking a chip right under each column
// header — no dropdowns. Only the tagged columns are imported.
export default function BankImportModal({ open, file, t, tableTitle, expense = false, onCancel, onImport }) {
  const [sheet, setSheet] = useState({ columns: [], rows: [], guess: {} });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState({ dateI: -1, descI: -1, amtI: -1 });

  useEffect(() => {
    if (!open || !file) return undefined;
    let cancelled = false;
    setLoading(true);
    readBankSheet(file)
      .then((s) => {
        if (cancelled) return;
        setSheet(s);
        const g = s.guess || {};
        setRoles({ dateI: g.dateI ?? -1, descI: g.descI ?? -1, amtI: g.amtI ?? -1 });
      })
      .catch(() => { if (!cancelled) message.error(t('Could not read the Excel file')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, file, t]);

  // Tagging a role to a column moves it off whichever column held it before
  // (roles store a single index); clicking the active chip clears it.
  const setRole = (key, ci) => setRoles((r) => ({ ...r, [key]: r[key] === ci ? -1 : ci }));

  const ROLE_META = useMemo(() => [
    { key: 'dateI', label: t('Date'), color: '#0785f4' },
    { key: 'descI', label: t('Description'), color: '#16a34a' },
    { key: 'amtI', label: t('Amount'), color: '#d97706' },
  ], [t]);

  const mapping = useMemo(
    () => ({ mode: 'single', dateI: roles.dateI, descI: roles.descI, amtI: roles.amtI, expense }),
    [roles, expense],
  );
  const parsed = useMemo(() => buildBankRows(sheet.rows, mapping), [sheet.rows, mapping]);
  const canImport = parsed.length > 0 && roles.amtI >= 0;

  const previewRows = useMemo(
    () => sheet.rows.slice(0, 40).map((r, i) => {
      const o = { key: i };
      sheet.columns.forEach((_, ci) => { o[ci] = r[ci] instanceof Date ? r[ci].toISOString().slice(0, 10) : r[ci]; });
      return o;
    }),
    [sheet.rows, sheet.columns],
  );

  const previewCols = useMemo(
    () => sheet.columns.map((c, ci) => {
      const assigned = ROLE_META.find((rm) => roles[rm.key] === ci);
      return {
        dataIndex: ci,
        key: ci,
        ellipsis: true,
        onHeaderCell: () => ({ style: assigned ? { background: `${assigned.color}22` } : undefined }),
        onCell: () => ({ style: assigned ? { background: `${assigned.color}11` } : undefined }),
        title: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
            <span style={{ fontWeight: 600, color: assigned ? assigned.color : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {ROLE_META.map((rm) => {
                const active = roles[rm.key] === ci;
                return (
                  <button
                    type="button"
                    key={rm.key}
                    onClick={() => setRole(rm.key, ci)}
                    style={{
                      cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '3px 7px', borderRadius: 999,
                      border: `1px solid ${active ? rm.color : 'rgba(0,0,0,0.15)'}`,
                      background: active ? rm.color : '#fff',
                      color: active ? '#fff' : 'var(--muted,#64748b)', fontWeight: active ? 600 : 400,
                    }}
                  >
                    {rm.label}
                  </button>
                );
              })}
            </div>
          </div>
        ),
      };
    }),
    [sheet.columns, roles, ROLE_META],
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
      <p style={{ color: 'var(--muted,#64748b)', marginTop: 0 }}>
        {t('Tag each column below: Date, Description, Amount. Everything else is ignored.')}
      </p>
      <Table
        size="small"
        columns={previewCols}
        dataSource={previewRows}
        pagination={false}
        loading={loading}
        scroll={{ x: 'max-content', y: 460 }}
        locale={{ emptyText: t('No rows found in the file') }}
      />
    </Modal>
  );
}
