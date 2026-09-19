'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Radio, Select, Table, message } from 'antd';
import { readBankSheet, buildBankRows } from '@/src/features/projektkalkyl/excelImport';

// Column-mapping step for a bank export (CSV/XLSX). The user picks which column is
// the date / description / amount (or separate money-in / money-out), sees a live
// preview, and confirms — we then hand normalized rows back to the caller.
export default function BankImportModal({ open, file, t, tableTitle, expense = false, onCancel, onImport }) {
  const [sheet, setSheet] = useState({ columns: [], rows: [], guess: {} });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('single');
  const [map, setMap] = useState({ dateI: -1, descI: -1, amtI: -1, inI: -1, outI: -1 });
  // Columns the user chose to hide from the preview (cosmetic — only mapped
  // columns are imported anyway).
  const [hiddenCols, setHiddenCols] = useState(() => new Set());

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    readBankSheet(file)
      .then((s) => {
        if (cancelled) return;
        setSheet(s);
        setHiddenCols(new Set());
        const g = s.guess || {};
        setMode(g.amtI >= 0 || (g.inI < 0 && g.outI < 0) ? 'single' : 'inout');
        setMap({
          dateI: g.dateI ?? -1,
          descI: g.descI ?? -1,
          amtI: g.amtI ?? -1,
          inI: g.inI ?? -1,
          outI: g.outI ?? -1,
        });
      })
      .catch(() => { if (!cancelled) message.error(t('Could not read the Excel file')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, file, t]);

  const colOptions = useMemo(
    () => [{ value: -1, label: `— ${t('None')} —` }, ...sheet.columns.map((c, i) => ({ value: i, label: c }))],
    [sheet.columns, t],
  );

  const mapping = useMemo(() => ({ ...map, mode, expense }), [map, mode, expense]);
  const parsed = useMemo(() => buildBankRows(sheet.rows, mapping), [sheet.rows, mapping]);

  // The columns actually used for the import — highlighted in the preview.
  const mappedIdx = useMemo(() => {
    const ids = mode === 'inout'
      ? [map.dateI, map.descI, map.inI, map.outI]
      : [map.dateI, map.descI, map.amtI];
    return new Set(ids.filter((i) => i >= 0));
  }, [map, mode]);

  const previewRows = useMemo(
    () => sheet.rows.slice(0, 6).map((r, i) => {
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
          width: 130,
          // Highlight the columns that will actually be imported; the small × on
          // a non-mapped column hides it from the preview to declutter.
          onHeaderCell: () => ({ style: isMapped ? { background: 'rgba(7,133,244,0.12)' } : undefined }),
          onCell: () => ({ style: isMapped ? { background: 'rgba(7,133,244,0.06)' } : undefined }),
          title: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>{c}</span>
              {!isMapped ? (
                <span
                  role="button"
                  title={t('Hide column')}
                  onClick={() => setHiddenCols((prev) => new Set(prev).add(ci))}
                  style={{ cursor: 'pointer', color: '#94a3b8', fontWeight: 700, lineHeight: 1 }}
                >
                  ×
                </span>
              ) : null}
            </span>
          ),
        };
      }),
    [sheet.columns, hiddenCols, mappedIdx, t],
  );

  const canImport = parsed.length > 0 && (mode === 'single' ? map.amtI >= 0 : (map.inI >= 0 || map.outI >= 0));

  const doImport = () => {
    if (!canImport) return;
    onImport(parsed);
  };

  const field = (label, value, onChange) => (
    <div style={{ flex: '1 1 150px', minWidth: 150 }}>
      <div className="planning-field-label">{label}</div>
      <Select size="small" value={value} onChange={onChange} options={colOptions} style={{ width: '100%' }} />
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={doImport}
      okText={`${t('Import')}${parsed.length ? ` (${parsed.length})` : ''}`}
      okButtonProps={{ disabled: !canImport, loading }}
      cancelText={t('Cancel')}
      width={720}
      title={tableTitle ? `${t('Import bank file')} — ${tableTitle}` : t('Import bank file')}
      destroyOnHidden
    >
      <p style={{ color: 'var(--muted,#64748b)', marginTop: 0 }}>
        {t('Match the columns from your bank file, then import the rows.')}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        {field(t('Date'), map.dateI, (v) => setMap((m) => ({ ...m, dateI: v })))}
        {field(t('Description'), map.descI, (v) => setMap((m) => ({ ...m, descI: v })))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <Radio.Group size="small" value={mode} onChange={(e) => setMode(e.target.value)}>
          <Radio.Button value="single">{t('One amount column')}</Radio.Button>
          <Radio.Button value="inout">{t('Separate in/out columns')}</Radio.Button>
        </Radio.Group>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {mode === 'single'
          ? field(t('Amount'), map.amtI, (v) => setMap((m) => ({ ...m, amtI: v })))
          : (
            <>
              {field(t('Money in'), map.inI, (v) => setMap((m) => ({ ...m, inI: v })))}
              {field(t('Money out'), map.outI, (v) => setMap((m) => ({ ...m, outI: v })))}
            </>
          )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="planning-field-label">
          {t('Preview')} <span style={{ color: 'var(--muted,#94a3b8)', fontWeight: 400 }}>· {t('Only the matched columns are imported')}</span>
        </span>
        {hiddenCols.size ? (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setHiddenCols(new Set())}>
            {t('Show hidden columns')} ({hiddenCols.size})
          </Button>
        ) : null}
      </div>
      <Table
        size="small"
        columns={previewCols}
        dataSource={previewRows}
        pagination={false}
        scroll={{ x: true }}
        loading={loading}
        locale={{ emptyText: t('No rows found in the file') }}
      />
    </Modal>
  );
}
