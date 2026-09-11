'use client';

import { useEffect, useState } from 'react';
import { Button, Dropdown } from 'antd';
import { CalculatorOutlined, DeleteOutlined, EditOutlined, SnippetsOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import { formatSek } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import { sideTotals, presetTables } from '@/src/features/projektkalkyl/kalkylModel';
import '@/src/features/projektkalkyl/projektkalkyl.scss';

export default function ProjektkalkylListPage() {
  const { kalkyler, loading, fetchAll, create, remove, fetchTemplates, createFromTemplate } = useProjektkalkylStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchAll();
    fetchTemplates().then(setTemplates).catch(() => {});
  }, [fetchAll, fetchTemplates]);

  const createAndOpen = async () => {
    // Seed the preset starter tables at creation (persisted) so a deliberately
    // emptied board stays empty on reopen instead of re-seeding.
    const created = await create({ name: t('New calculation'), tables: presetTables(t) });
    if (created) navigate(getEntityId(created));
  };

  useAddButton(createAndOpen, 'New calculation');

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="admin-link-cell">{name || t('New calculation')}</span>,
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

  const fromTemplate = async (templateId) => {
    const created = await createFromTemplate(templateId);
    if (created) navigate(getEntityId(created));
  };

  return (
    <>
      {templates.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Dropdown
            menu={{
              items: templates.map((tpl) => ({ key: getEntityId(tpl), label: tpl.name || t('New table') })),
              onClick: ({ key }) => fromTemplate(key),
            }}
          >
            <Button icon={<SnippetsOutlined />}>{t('From template')}</Button>
          </Dropdown>
        </div>
      ) : null}
      <AdminTable
        dataSource={kalkyler}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: false }}
        onRowClick={(record) => navigate(getEntityId(record))}
        emptyState={{
          icon: <CalculatorOutlined />,
          title: t('No calculations yet'),
          description: t('Create a calculation and enter incomes and costs to see the result — no Excel needed.'),
          actionLabel: t('New calculation'),
          onAction: createAndOpen,
        }}
      />
    </>
  );
}
