import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined, SettingOutlined } from '@ant-design/icons';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusTag from '@/src/shared/components/StatusTag';
import { IconButton } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { appMessage } from '@/src/utils/appMessage';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { materialOrdersApi } from './materialOrdersApi';
import MaterialOrderModal from './MaterialOrderModal';
import SupplierSettingsModal from './SupplierSettingsModal';

const SENDERS = ['superadmin', 'companyAdmin', 'projectAdmin'];

// Project → Material: Materialbeställningar to grossists (Lundagrossisten…).
export default function ProjectMaterialTab({ project }) {
  const t = useT();
  const role = useAuthStore((s) => s.user?.role);
  const isCompanyAdmin = ['superadmin', 'companyAdmin'].includes(role);
  const canSend = SENDERS.includes(role);
  const projectId = project?._id;
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const [list, sup] = await Promise.all([materialOrdersApi.list(projectId), materialOrdersApi.suppliers()]);
      setOrders(list);
      setSuppliers(sup);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not load'));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => { void load(); }, [load]);

  const send = async (order) => {
    if (!suppliers.find((s) => s.supplier === order.supplier)?.canOrder) {
      appMessage.error(`${t('No order e-mail')} — ${order.supplier}`);
      if (isCompanyAdmin) setSettingsOpen(true);
      return;
    }
    try {
      await materialOrdersApi.send(order._id);
      appMessage.success(t('Order sent'));
      void load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not send'));
    }
  };

  const remove = async (order) => {
    try {
      await materialOrdersApi.remove(order._id);
      void load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not delete'));
    }
  };

  const columns = [
    { title: t('No.'), dataIndex: 'orderNumber', key: 'nr', width: 72 },
    { title: t('Supplier'), dataIndex: 'supplier', key: 'supplier' },
    { title: t('Articles'), key: 'rows', width: 96, align: 'right', render: (_, o) => o.rows?.length || 0 },
    { title: t('Desired date'), dataIndex: 'desiredDate', key: 'date', render: (v) => formatAdminDate(v) },
    { title: t('Status'), dataIndex: 'status', key: 'status', render: (v) => <StatusTag status={v} upper /> },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, o) => (
        <AdminTableActions
          items={[
            o.status === 'draft' && {
              key: 'edit', label: t('Edit'), icon: <EditOutlined />, onClick: () => setEditing(o),
            },
            o.status === 'draft' && canSend && {
              key: 'send', label: t('Send'), icon: <SendOutlined />, onClick: () => send(o),
            },
            o.status === 'draft' && {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete order?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(o),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        {isCompanyAdmin && (
          <IconButton aria-label={t('Suppliers')} title={t('Suppliers')} onClick={() => setSettingsOpen(true)}>
            <SettingOutlined />
          </IconButton>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>
          {t('New order')}
        </Button>
      </div>

      <Table
        dataSource={orders}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={false}
        onRow={(o) => (o.status === 'draft' ? { onClick: (e) => { if (!e.target.closest('.ant-dropdown-trigger, button')) setEditing(o); } } : {})}
      />

      <MaterialOrderModal
        open={editing !== undefined}
        order={editing || null}
        project={project}
        suppliers={suppliers}
        onClose={() => setEditing(undefined)}
        onSaved={() => load()}
      />
      <SupplierSettingsModal
        open={settingsOpen}
        suppliers={suppliers}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => load()}
      />
    </div>
  );
}
