import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Input, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { GROSSISTS } from '@/src/features/articles/priceList/grossists';
import PriceListImportModal from '@/src/features/articles/priceList/PriceListImportModal';
import { isPriceListStale, latestPriceListDate } from '@/src/features/articles/priceList/priceListFiles';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { materialOrdersApi } from './materialOrdersApi';

// Per-company ordering settings per grossist: order e-mail + kundnummer, plus
// when its price list was last imported (warning after 90 days, Mowin-style).
export default function SupplierSettingsModal({ open, suppliers, onClose, onSaved }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const [importFor, setImportFor] = useState(null);

  useEffect(() => {
    if (!open) return;
    const list = suppliers.map((s) => ({ ...s, orderEmail: s.orderEmail || '', customerNumber: s.customerNumber || '' }));
    if (!list.some((s) => s.supplier === 'Lundagrossisten')) {
      list.push({ supplier: 'Lundagrossisten', orderEmail: '', customerNumber: '', isNew: true });
    }
    setRows(list);
    setAdding('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fresh import dates (after an import) without dropping unsaved edits.
  useEffect(() => {
    const byName = new Map(suppliers.map((s) => [s.supplier, s.priceLists]));
    setRows((rs) => rs.map((r) => (byName.has(r.supplier) ? { ...r, priceLists: byName.get(r.supplier) } : r)));
  }, [suppliers]);

  const addOptions = useMemo(
    () => GROSSISTS.filter((g) => !rows.some((r) => r.supplier === g)).map((value) => ({ value })),
    [rows],
  );

  const edit = (supplier, patch) => setRows((rs) => rs.map((r) => (r.supplier === supplier ? { ...r, ...patch, dirty: true } : r)));

  const addSupplier = (name) => {
    const v = String(name || '').trim();
    if (v && !rows.some((r) => r.supplier === v)) {
      setRows((rs) => [...rs, { supplier: v, orderEmail: '', customerNumber: '', isNew: true }]);
    }
    setAdding('');
  };

  const save = async () => {
    setBusy(true);
    try {
      for (const r of rows.filter((x) => x.dirty)) {
        await materialOrdersApi.saveSupplier(r.supplier, { orderEmail: r.orderEmail.trim(), customerNumber: r.customerNumber.trim() });
      }
      appMessage.success(t('Saved'));
      onSaved?.();
      onClose();
    } catch (err) {
      appMessage.error(err.response?.data?.message?.toString() || t('Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { title: t('Supplier'), dataIndex: 'supplier', key: 'supplier', width: 180 },
    {
      title: t('Order e-mail'),
      key: 'email',
      render: (_, r) => (
        <Input type="email" value={r.orderEmail} onChange={(e) => edit(r.supplier, { orderEmail: e.target.value })} />
      ),
    },
    {
      title: t('Customer no.'),
      key: 'nr',
      width: 160,
      render: (_, r) => <Input value={r.customerNumber} onChange={(e) => edit(r.supplier, { customerNumber: e.target.value })} />,
    },
    {
      title: t('Price list'),
      key: 'priceList',
      width: 260,
      render: (_, r) => {
        const latest = latestPriceListDate(r.priceLists);
        const stale = isPriceListStale(r.priceLists);
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {latest && (
              <Typography.Text type="secondary">
                {`${t('Price list updated')} ${formatAdminDate(latest)}`}
              </Typography.Text>
            )}
            {stale && <WarningOutlined style={{ color: '#d97706' }} aria-label={t('Update the price list')} />}
            {stale && (
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setImportFor(r.supplier)}>
                {t('Update the price list')}
              </Button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <AdminModal
      title={t('Suppliers')}
      open={open}
      onCancel={onClose}
      onSave={save}
      saveDisabled={!rows.some((r) => r.dirty)}
      saveLoading={busy}
      width={1000}
      destroyOnHidden
    >
      <Table dataSource={rows} columns={columns} rowKey="supplier" pagination={false} size="small" />
      <AutoComplete
        value={adding}
        options={addOptions}
        onChange={setAdding}
        onSelect={addSupplier}
        placeholder={t('Add supplier')}
        style={{ width: 240, marginTop: 16 }}
        onKeyDown={(e) => { if (e.key === 'Enter') addSupplier(adding); }}
      />
      <PriceListImportModal
        open={!!importFor}
        supplier={importFor}
        onClose={() => setImportFor(null)}
        onDone={onSaved}
      />
    </AdminModal>
  );
}
