import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Space } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import AdminDrawer from '../components/AdminDrawer';
import ToolCreateForm from '../components/ToolCreateForm';
import AdminTable from '../components/AdminTable';
import RoleBasedAccess from '../components/RoleBasedAccess';
import { useProjectsInfo, useUsersInfo } from '../hooks/useEntitiesInfo';
import { useToolStore } from '../store/toolStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://byggexp.sda-api.ru';

const resolvePhotoUrl = (value) => {
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

export default function ToolListPage() {
  const { tools, loading, fetchAllAccessible, remove } = useToolStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const projectIds = useMemo(
    () => tools.flatMap((tool) => tool.projectIds || []).filter(Boolean),
    [tools],
  );
  const workerIds = useMemo(
    () => tools.flatMap((tool) => tool.workerIds || []).filter(Boolean),
    [tools],
  );
  const { projects } = useProjectsInfo(projectIds);
  const { users } = useUsersInfo(workerIds);

  const showDrawer = (toolToEdit = null) => {
    setEditingTool(toolToEdit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingTool(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showDrawer(), 'Add tool');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Photo',
      key: 'photo',
      render: (_, tool) => {
        const photoUrl = resolvePhotoUrl(tool.photoUrl);
        return photoUrl ? (
          <img src={photoUrl} alt={tool.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Workers',
      key: 'workers',
      render: (_, tool) => {
        const names = (tool.workerIds || [])
          .map((workerId) => users[workerId]?.name)
          .filter(Boolean);

        return names.length ? names.join(', ') : '-';
      },
    },
    {
      title: 'Projects',
      key: 'projects',
      render: (_, tool) => {
        const names = (tool.projectIds || [])
          .map((projectId) => projects[projectId]?.name)
          .filter(Boolean);

        return names.length ? names.join(', ') : '-';
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (value) => value || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      ellipsis: false,
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
            <Popconfirm
              title="Delete tool?"
              onConfirm={() => remove(record._id)}
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
      <AdminTable
        dataSource={tools}
        columns={columns}
        rowKey="_id"
        loading={loading}
      />

      <AdminDrawer
        title={editingTool ? 'Edit tool' : 'Create tool'}
        saveForm="tool-create-form"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <ToolCreateForm onClose={closeDrawer} toolToEdit={editingTool} />
      </AdminDrawer>
    </>
  );
}
