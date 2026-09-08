'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Select, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { useProjektkalkylStore, kalkylTotals } from '@/src/store/projektkalkylStore';

const emptyRow = () => ({ description: '', type: 'cost', category: '', amount: null });

export default function ProjektkalkylDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { fetchOne, update } = useProjektkalkylStore();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [momsMode, setMomsMode] = useState('ex');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const k = await fetchOne(id);
        if (!alive) return;
        setName(k.name || '');
        setNote(k.note || '');
        setMomsMode(k.momsMode || 'ex');
        setRows(Array.isArray(k.rows) && k.rows.length ? k.rows : [emptyRow()]);
      } catch {
        message.error(t('Could not load the calculation'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, fetchOne, t]);

  const totals = useMemo(() => kalkylTotals(rows), [rows]);

  const setRow = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const clean = rows.filter((r) => r.description || r.amount != null);
      await update(id, { name, note, momsMode, rows: clean });
      message.success(t('Saved'));
    } catch {
      /* store shows the error */
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(pathname.replace(/\/[^/]+$/, ''));

  const CATEGORY_OPTIONS = [
    { value: '', label: '—' },
    { value: 'material', label: t('Material') },
    { value: 'lon', label: t('Labour') },
    { value: 'ue', label: t('Subcontractor') },
    { value: 'maskin', label: t('Machines') },
    { value: 'ovrigt', label: t('Other') },
  ];

  if (loading) return <div style={{ padding: 24 }}>{t('Loading…')}</div>;

  return (
    <div className="projektkalkyl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>{t('Back')}</Button>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Name')}
          style={{ maxWidth: 360, fontWeight: 600, fontSize: 16 }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>{t('Excl. VAT')}</span>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>{t('Save')}</Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="projektkalkyl__table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--muted, #64748b)', fontSize: 13 }}>
              <th style={{ padding: '8px 8px' }}>{t('Description')}</th>
              <th style={{ padding: '8px 8px', width: 140 }}>{t('Type')}</th>
              <th style={{ padding: '8px 8px', width: 160 }}>{t('Category')}</th>
              <th style={{ padding: '8px 8px', width: 160, textAlign: 'right' }}>{t('Amount')} (SEK)</th>
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <td style={{ padding: '6px 8px' }}>
                  <Input
                    value={r.description}
                    onChange={(e) => setRow(i, { description: e.target.value })}
                    placeholder={t('e.g. Material, À conto 1, Subcontractor')}
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <Select
                    value={r.type}
                    onChange={(v) => setRow(i, { type: v })}
                    style={{ width: '100%' }}
                    options={[{ value: 'income', label: t('Income') }, { value: 'cost', label: t('Cost') }]}
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <Select
                    value={r.category || ''}
                    onChange={(v) => setRow(i, { category: v })}
                    style={{ width: '100%' }}
                    options={CATEGORY_OPTIONS}
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <InputNumber
                    value={r.amount}
                    onChange={(v) => setRow(i, { amount: v })}
                    style={{ width: '100%' }}
                    controls={false}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    parser={(v) => (v || '').replace(/\s/g, '')}
                  />
                </td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <Button type="text" icon={<DeleteOutlined />} onClick={() => removeRow(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button icon={<PlusOutlined />} onClick={addRow} style={{ marginTop: 12 }}>{t('Add row')}</Button>

      <div className="projektkalkyl__totals" style={{ marginTop: 24, maxWidth: 420, marginLeft: 'auto' }}>
        <Row label={t('Total income')} value={formatSek(totals.income)} />
        <Row label={t('Total costs')} value={formatSek(totals.cost)} />
        <div style={{ borderTop: '2px solid var(--border, #e2e8f0)', margin: '8px 0' }} />
        <Row
          label={t('Result')}
          value={formatSek(totals.result)}
          strong
          color={totals.result < 0 ? '#e5484d' : '#16a35f'}
        />
        <Row label={t('Margin %')} value={totals.margin == null ? '—' : `${totals.margin}%`} />
      </div>

      <div style={{ marginTop: 24, maxWidth: 640 }}>
        <label style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>{t('Note')}</label>
        <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}

function Row({ label, value, strong, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: strong ? 18 : 15 }}>
      <span style={{ color: 'var(--muted, #64748b)' }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500, color: color || 'inherit', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
