'use client';

import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import KalkylTable from '@/src/features/projektkalkyl/KalkylTable';

export default function Side({ money, t, title, tables, totals, totalColor, patchTable, moveTable, removeTable, onAdd, onImport, onExtractRows, onScan, onScanFiles, onToggleDetail, detailTables = [], onShowDetail, scanEnabled }) {
  const renderTable = (tb, i, arr, startFolded) => (
    <KalkylTable key={tb.id} money={money} t={t} table={tb} isFirst={i === 0} isLast={i === arr.length - 1}
      startFolded={startFolded}
      onChange={(u) => patchTable(tb.id, u)} onMove={(d) => moveTable(tb.id, d)} onRemove={() => removeTable(tb.id)}
      onImport={onImport ? () => onImport(tb.id) : null}
      onExtractRows={onExtractRows ? (rowsToMove, cols) => onExtractRows(tb.id, rowsToMove, cols) : null}
      onToggleDetail={onToggleDetail ? () => onToggleDetail(tb.id) : null}
      onScan={scanEnabled && onScan ? () => onScan(tb.id) : null}
      onScanFiles={scanEnabled && onScanFiles ? (files) => onScanFiles(tb.id, files) : null} />
  );
  return (
    <div style={{ flex: '1 1 460px', minWidth: 320, display: 'flex', flexDirection: 'column' }}>
      {title ? <h3 style={{ margin: '0 0 12px' }}>{title}</h3> : null}
      {tables.map((tb, i) => renderTable(tb, i, tables, false))}
      <Button icon={<PlusOutlined />} onClick={onAdd} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>{t('Add table')}</Button>
      {detailTables.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 2px 8px' }}>
            <span style={{ color: 'var(--muted,#64748b)', fontSize: 12, fontWeight: 600 }}>
              {t('Detailed sheets')} ({detailTables.length})
            </span>
            {onShowDetail ? (
              <button type="button" onClick={onShowDetail}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted,#64748b)', fontSize: 12, textDecoration: 'underline' }}>
                {t('Edit full width')} ↗
              </button>
            ) : null}
          </div>
          {detailTables.map((tb, i) => renderTable(tb, i, detailTables, true))}
        </div>
      ) : null}
      <div style={{ marginTop: 'auto', background: totalColor, color: '#fff', borderRadius: 10, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
        <span>TOTAL</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {money(totals.brutto)}
          {totals.vat > 0 ? <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.9, marginLeft: 8 }}>
            ({t('excl.')} {money(totals.netto)} + {t('VAT')} {money(totals.vat)})</span> : null}
        </span>
      </div>
    </div>
  );
}
