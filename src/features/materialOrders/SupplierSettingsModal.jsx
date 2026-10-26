import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Input } from 'antd';
import AdminModal from '@/src/shared/components/AdminModal';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { GROSSISTS } from '@/src/features/articles/priceList/grossists';
import { materialOrdersApi } from './materialOrdersApi';

// Per-company ordering settings per grossist: order e-mail + kundnummer.
export default function SupplierSettingsModal({ open, suppliers, onClose, onSaved }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const list = suppliers.map((s) => ({ ...s, orderEmail: s.orderEmail || '', customerNumber: s.customerNumber || '' }));
    if (!list.some((s) => s.supplier === 'Lundagrossisten')) {
      list.push({ supplier: 'Lundagrossisten', orderEmail: '', customerNumber: '', isNew: true });
    }
    setRows(list);
    setAdding('');
  }, [open, suppliers]);

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
  ];

  return (
    <AdminModal
      title={t('Suppliers')}
      open={open}
      onCancel={onClose}
      onSave={save}
      saveDisabled={!rows.some((r) => r.dirty)}
      saveLoading={busy}
      width={760}
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
    </AdminModal>
  );
}
