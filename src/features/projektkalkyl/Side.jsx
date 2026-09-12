'use client';

import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import KalkylTable from '@/src/features/projektkalkyl/KalkylTable';

export default function Side({ money, t, title, tables, totals, totalColor, patchTable, moveTable, removeTable, onAdd, onImport, onScan, onScanFiles, scanEnabled }) {
  return (
    <div style={{ flex: '1 1 460px', minWidth: 320, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      {tables.map((tb, i) => (
        <KalkylTable key={tb.id} money={money} t={t} table={tb} isFirst={i === 0} isLast={i === tables.length - 1}
          onChange={(u) => patchTable(tb.id, u)} onMove={(d) => moveTable(tb.id, d)} onRemove={() => removeTable(tb.id)}
          onImport={onImport ? () => onImport(tb.id) : null}
          onScan={scanEnabled && onScan ? () => onScan(tb.id) : null}
          onScanFiles={scanEnabled && onScanFiles ? (files) => onScanFiles(tb.id, files) : null} />
      ))}
      <Button icon={<PlusOutlined />} onClick={onAdd} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>{t('Add table')}</Button>
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
