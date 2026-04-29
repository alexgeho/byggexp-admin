import { useEffect, useState } from 'react';
import { Table, Button, Drawer, message, Popconfirm, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCompanyStore } from '../store/companyStore';
import CompanyCreateForm from '../components/CompanyCreateForm';
import { useOutletContext } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';

export default function CompanyListPage() {
  const { companies, loading, fetchAll, remove, update } = useCompanyStore();
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin']}>
            <Popconfirm
              title="Delete company?"
              onConfirm={() => handleDelete(record._id)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </RoleBasedAccess>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={companies}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingCompany ? 'Edit company' : 'Create company'}
        width={520}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeDrawer} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" form="company-create-form" key="submit" htmlType="submit">Save</Button>
          </div>
        }
      >
        <CompanyCreateForm onClose={closeDrawer} companyToEdit={editingCompany} />
      </Drawer>
    </>
  );
}
