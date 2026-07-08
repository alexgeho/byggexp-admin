import { useEffect, useState } from 'react';
import { message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCompanyStore } from '@/src/store/companyStore';
import CompanyCreateForm from '@/src/features/companies/components/CompanyCreateForm';
import AdminDrawer from '@/src/shared/components/AdminDrawer';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useOutletContext } from '@/src/shared/routing/routerCompat';

export default function CompanyListPage() {
  const { companies, loading, fetchAll, remove } = useCompanyStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showDrawer = (companyToEdit = null) => {
    setEditingCompany(companyToEdit);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setEditingCompany(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    fetchAll();
    registerAddButton(() => showDrawer(), 'Add company');
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
              onClick: () => showDrawer(record),
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
      />

      <AdminDrawer
        title={editingCompany ? 'Edit company' : 'Create company'}
        saveForm="company-create-form"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <CompanyCreateForm onClose={closeDrawer} companyToEdit={editingCompany} />
      </AdminDrawer>
    </>
  );
}
