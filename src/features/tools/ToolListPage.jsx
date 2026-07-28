import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import { DeleteOutlined, EditOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import AdminModal from '@/src/shared/components/AdminModal';
import ToolCreateForm from '@/src/features/tools/components/ToolCreateForm';
import ToolManageModal from '@/src/features/tools/components/ToolManageModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import ToolPhotoStrip from '@/src/features/tools/components/ToolPhotoStrip';
import { useToolStore } from '@/src/store/toolStore';
import { matchesEntityId } from '@/src/utils/entityId';

export default function ToolListPage() {
  const { tools, loading, fetchAllAccessible, remove } = useToolStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [manageToolId, setManageToolId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const projectIds = useMemo(
    () => tools.flatMap((tool) => tool.projectIds || []).filter(Boolean),
    [tools],
  );
  const workerIds = useMemo(
    () => tools.flatMap((tool) => [...(tool.workerIds || []), tool.currentHolderId]).filter(Boolean),
    [tools],
  );
  const { projects } = useProjectsInfo(projectIds);
  const { users } = useUsersInfo(workerIds);

  const filteredTools = useMemo(() => {
    if (!selectedProjectId) {
      return tools;
    }

    return tools.filter((tool) =>
      (tool.projectIds || []).some((projectId) =>
        matchesEntityId({ _id: projectId }, selectedProjectId),
      ),
    );
  }, [tools, selectedProjectId]);

  const toolbarStart = useMemo(() => (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      />
    </div>
  ), [selectedProjectId]);

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
      key: 'photos',
      render: (_, tool) => <ToolPhotoStrip tool={tool} alt={tool.name} />,
    },
    {
      title: 'QR',
      key: 'qr',
      render: (_, tool) => (tool.qrId ? <Tag icon={<QrcodeOutlined />} style={{ fontFamily: 'monospace' }}>{tool.qrId}</Tag> : '-'),
    },
    {
      title: 'Held by',
      key: 'heldBy',
      render: (_, tool) => {
        if (tool.currentHolderId) return users[tool.currentHolderId]?.name || '—';
        const names = (tool.workerIds || [])
          .map((workerId) => users[workerId]?.name)
          .filter(Boolean);
        return names.length ? names.join(', ') : 'Storage';
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
              key: 'manage',
              label: 'QR & hand-off',
              icon: <QrcodeOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setManageToolId(record._id),
            },
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
        dataSource={filteredTools}
        columns={columns}
        rowKey="_id"
        loading={loading}
        toolbarStart={toolbarStart}
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

      <ToolManageModal
        open={!!manageToolId}
        tool={tools.find((tool) => matchesEntityId(tool, manageToolId)) || null}
        onClose={() => setManageToolId(null)}
      />
    </>
  );
}
