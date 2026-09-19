'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Table, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { readBankSheet, buildBankRows, detectRoles } from '@/src/features/projektkalkyl/excelImport';

// One source of truth: the columns you keep. The Date / Description / Amount are
// detected automatically (and labelled on the header); × out a column you don't
// want and the roles re-detect over what's left. No dropdowns.
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

  // Re-detect roles over the columns the user has kept.
  const roles = useMemo(
    () => detectRoles(sheet.columns, sheet.rows, hiddenCols),
    [sheet.columns, sheet.rows, hiddenCols],
  );

  const ROLE_OF = useMemo(() => {
    const m = {};
    if (roles.dateI >= 0) m[roles.dateI] = { label: t('Date'), color: '#0785f4' };
    if (roles.descI >= 0) m[roles.descI] = { label: t('Description'), color: '#16a34a' };
    if (roles.amtI >= 0) m[roles.amtI] = { label: t('Amount'), color: '#d97706' };
    return m;
  }, [roles, t]);

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
    () => sheet.columns
      .map((c, ci) => ({ c, ci }))
      .filter(({ ci }) => !hiddenCols.has(ci))
      .map(({ c, ci }) => {
        const role = ROLE_OF[ci];
        return {
          dataIndex: ci,
          key: ci,
          ellipsis: true,
          width: 160,
          onHeaderCell: () => ({ style: role ? { background: `${role.color}18` } : undefined }),
          onCell: () => ({ style: role ? { background: `${role.color}0d` } : undefined }),
          title: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
                <CloseOutlined
                  title={t('Hide column')}
                  onClick={() => setHiddenCols((prev) => new Set(prev).add(ci))}
                  style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 11, flexShrink: 0 }}
                />
              </span>
              {role ? (
                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, color: '#fff', background: role.color, borderRadius: 999, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {role.label}
                </span>
              ) : <span style={{ height: 15 }} />}
            </div>
          ),
        };
      }),
    [sheet.columns, hiddenCols, ROLE_OF, t],
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
      <p style={{ color: 'var(--muted,#64748b)', marginTop: 0, marginBottom: 12 }}>
        {t('Date, description and amount are detected automatically. Hide a column you do not need with ×.')}
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
