'use client';

import { useEffect } from 'react';
import { CalculatorOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import { formatSek } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import { sideTotals } from '@/src/features/projektkalkyl/kalkylModel';

export default function ProjektkalkylListPage() {
  const { kalkyler, loading, fetchAll, create, remove } = useProjektkalkylStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createAndOpen = async () => {
    const created = await create({ name: t('New calculation'), tables: [] });
    if (created) navigate(getEntityId(created));
  };

  useAddButton(createAndOpen, 'New calculation');

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name) => name || t('New calculation'),
    },
    {
      title: t('Result'),
      key: 'result',
      render: (_, record) => {
        const income = sideTotals(record.tables, 'income').brutto;
        const expense = sideTotals(record.tables, 'expense').brutto;
        const result = income - expense;
        return (
          <span style={{ fontWeight: 600, color: result < 0 ? '#e5484d' : '#16a35f' }}>
            {formatSek(result)}
          </span>
        );
      },
    },
    {
      title: t('Created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d) => (d ? formatAdminDate(d) : '-'),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'open',
              label: t('Open'),
              icon: <EditOutlined />,
              onClick: () => navigate(getEntityId(record)),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete calculation?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminTable
      dataSource={kalkyler}
      columns={columns}
      rowKey="_id"
      loading={loading}
      scroll={{ x: false }}
      onRow={(record) => ({ onClick: () => navigate(getEntityId(record)) })}
      emptyState={{
        icon: <CalculatorOutlined />,
        title: t('No calculations yet'),
        description: t('Create a calculation and enter incomes and costs to see the result — no Excel needed.'),
        actionLabel: t('New calculation'),
        onAction: createAndOpen,
      }}
    />
  );
}
