import { useEffect, useState } from 'react';
import { message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyStore } from '@/src/store/companyStore';
import CompanyCreateForm from '@/src/features/companies/components/CompanyCreateForm';
import CompanyModulesModal from '@/src/features/companies/components/CompanyModulesModal';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useOutletContext } from '@/src/shared/routing/routerCompat';

export default function CompanyListPage() {
  const t = useT();
  const { companies, loading, fetchAll, remove } = useCompanyStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [modulesCompany, setModulesCompany] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

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
    registerAddButton(() => showModal(), 'Add company');
    return () => unregisterAddButton();
  }, [fetchAll, registerAddButton, unregisterAddButton]);

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success('Company deleted');
    } catch {
      message.error('Failed to delete company');
    }
  };

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
