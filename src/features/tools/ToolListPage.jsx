import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import AdminModal from '@/src/shared/components/AdminModal';
import ToolCreateForm from '@/src/features/tools/components/ToolCreateForm';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useToolStore } from '@/src/store/toolStore';
import { API_BASE_URL } from '@/src/config/apiConfig';

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
  const [modalOpen, setModalOpen] = useState(false);
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

  const showModal = (toolToEdit = null) => {
    setEditingTool(toolToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingTool(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showModal(), 'Add tool');

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
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: 'Delete tool?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => remove(record._id),
            },
          ]}
        />
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

      <AdminModal
        title={editingTool ? 'Edit tool' : 'Add tool'}
        saveForm="tool-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <ToolCreateForm onClose={closeModal} toolToEdit={editingTool} />
      </AdminModal>
    </>
  );
}
