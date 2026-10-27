import { useCallback, useEffect, useMemo, useState } from 'react';
import { AutoComplete, Form, Input } from 'antd';
import { DeleteOutlined, EditOutlined, ShopOutlined, UploadOutlined, WarningOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { orDash } from '@/src/shared/components/EmptyCell';
import { appMessage } from '@/src/utils/appMessage';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { GROSSISTS } from '@/src/features/articles/priceList/grossists';
import PriceListImportModal from '@/src/features/articles/priceList/PriceListImportModal';
import { isPriceListStale, latestPriceListDate } from '@/src/features/articles/priceList/priceListFiles';
import { materialOrdersApi } from './materialOrdersApi';

// Register → Leverantörer: the grossists material is ordered from. "Ta bort"
// only hides the supplier (articles and old orders stay); adding it again
// with the same name brings it back.
export default function SupplierListPage() {
  const t = useT();
  const [form] = Form.useForm();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [busy, setBusy] = useState(false);
  const [importFor, setImportFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSuppliers(await materialOrdersApi.suppliers());
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (s = null) => {
    setEditing(s);
    form.setFieldsValue({
      supplier: s?.supplier || '',
      orderEmail: s?.orderEmail || '',
      customerNumber: s?.customerNumber || '',
    });
  };

  useAddButton(() => open(), 'Add supplier');

  const save = async (values) => {
    setBusy(true);
    try {
      await materialOrdersApi.saveSupplier(values.supplier.trim(), {
        orderEmail: (values.orderEmail || '').trim(),
        customerNumber: (values.customerNumber || '').trim(),
      });
      appMessage.success(t('Saved'));
      setEditing(undefined);
      load();
    } catch (err) {
      appMessage.error(err.response?.data?.message?.toString() || t('Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s) => {
    try {
      await materialOrdersApi.removeSupplier(s.supplier);
      load();
    } catch (err) {
      appMessage.error(err.response?.data?.message?.toString() || t('Could not save'));
    }
  };

  const nameOptions = useMemo(
    () => GROSSISTS.filter((g) => !suppliers.some((s) => s.supplier === g)).map((value) => ({ value })),
    [suppliers],
  );

  const columns = [
    { title: t('Name'), dataIndex: 'supplier', key: 'supplier' },
    { title: t('E-mail for orders'), dataIndex: 'orderEmail', key: 'orderEmail', render: orDash },
    { title: t('Customer number'), dataIndex: 'customerNumber', key: 'customerNumber', width: 160, render: orDash },
    {
      title: t('Price list'),
      key: 'priceList',
      width: 180,
      render: (_, s) => {
        const latest = latestPriceListDate(s.priceLists);
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {latest ? formatAdminDate(latest) : orDash()}
            {latest && isPriceListStale(s.priceLists) && (
              <WarningOutlined style={{ color: '#d97706' }} aria-label={t('Update the price list')} />
            )}
          </span>
        );
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, s) => (
        <AdminTableActions
          items={[
            { key: 'edit', label: t('Edit'), icon: <EditOutlined />, onClick: () => open(s) },
            { key: 'import', label: t('Import price list'), icon: <UploadOutlined />, onClick: () => setImportFor(s.supplier) },
            {
              key: 'remove',
              label: t('Remove'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Remove supplier?'),
              confirmOkText: t('Remove'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(s),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={suppliers}
        columns={columns}
        rowKey="supplier"
        loading={loading}
        onRow={(s) => ({ onClick: (e) => { if (!e.target.closest('.ant-dropdown-trigger, button')) open(s); } })}
        emptyState={{
          icon: <ShopOutlined />,
          title: t('No suppliers yet'),
          actionLabel: t('Add supplier'),
          onAction: () => open(),
        }}
      />

      <AdminModal
        title={editing ? editing.supplier : t('Add supplier')}
        open={editing !== undefined}
        onCancel={() => setEditing(undefined)}
        saveForm="supplier-form"
        saveLoading={busy}
        destroyOnHidden
      >
        <Form id="supplier-form" form={form} layout="vertical" onFinish={save} requiredMark={false}>
          {!editing && (
            <Form.Item name="supplier" label={t('Name')} rules={[{ required: true, whitespace: true, message: t('Required') }]}>
              <AutoComplete
                options={nameOptions}
                autoFocus
                filterOption={(input, o) => !!input && o.value.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          )}
          <Form.Item name="orderEmail" label={t('E-mail for orders')} rules={[{ type: 'email', message: t('Please enter a valid email') }]}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="customerNumber" label={t('Customer number')}>
            <Input />
          </Form.Item>
        </Form>
      </AdminModal>

      <PriceListImportModal
        open={!!importFor}
        supplier={importFor}
        onClose={() => setImportFor(null)}
        onDone={load}
      />
    </>
  );
}
