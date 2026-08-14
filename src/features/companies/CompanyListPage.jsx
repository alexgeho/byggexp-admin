import { useEffect, useState } from 'react';
import { message, Tag, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyStore } from '@/src/store/companyStore';
import CompanyCreateForm from '@/src/features/companies/components/CompanyCreateForm';
import CompanyModulesModal from '@/src/features/companies/components/CompanyModulesModal';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';

export default function CompanyListPage() {
  const t = useT();
  const { companies, loading, fetchAll, remove } = useCompanyStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [modulesCompany, setModulesCompany] = useState(null);
  const [selected, setSelected] = useState([]);

  const showModal = (companyToEdit = null) => {
    setEditingCompany(companyToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingCompany(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAddButton(() => showModal(), 'Add company');

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success('Company deleted');
    } catch {
      message.error('Failed to delete company');
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: t('Delete selected companies?'),
      okText: t('Delete'),
      okButtonProps: { danger: true },
      cancelText: t('Cancel'),
      onOk: async () => {
        let ok = 0;
        let fail = 0;
        for (const company of selected) {
          try {
            await remove(company._id);
            ok += 1;
          } catch {
            fail += 1;
          }
        }
        if (ok) message.success(`${ok} ${t('deleted')}`);
        if (fail) message.error(`${fail} ${t('could not be deleted')}`);
        setSelected([]);
      },
    });
  };

  const bulkBar = selected.length ? (
    <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
      {t('Delete')} ({selected.length})
    </Button>
  ) : null;

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan) =>
        plan ? <Tag color="blue">{t(plan)}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'modules',
              label: 'Modules',
              icon: <AppstoreOutlined />,
              roles: ['superadmin'],
              onClick: () => setModulesCompany(record),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin'],
              confirmTitle: 'Delete company?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => handleDelete(record._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={companies}
        columns={columns}
        rowKey="_id"
        loading={loading}
        toolbarStart={null}
        toolbarEnd={bulkBar}
        rowSelection={{
          selectedRowKeys: selected.map((company) => company._id),
          onChange: (_keys, rows) => setSelected(rows),
        }}
      />

      <AdminModal
        title={editingCompany ? 'Edit company' : 'Create company'}
        saveText={editingCompany ? 'Save' : 'Send'}
        saveForm="company-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <CompanyCreateForm onClose={closeModal} companyToEdit={editingCompany} />
      </AdminModal>

      <CompanyModulesModal
        company={modulesCompany}
        open={Boolean(modulesCompany)}
        onClose={() => setModulesCompany(null)}
      />
    </>
  );
}
