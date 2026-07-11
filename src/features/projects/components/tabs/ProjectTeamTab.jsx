import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import { useProjectStore } from '@/src/store/projectStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { DeleteOutlined } from '@ant-design/icons';

export default function ProjectTeamTab({ projectId, onRefresh }) {
  const { removeWorker, addWorkers } = useProjectStore();
  const updateUser = useUserStore((state) => state.update);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!projectId) {
      setTeamMembers([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/users/project/${projectId}`);
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load project team:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleUserCreated = useCallback(async (createdUser) => {
    const userId = getEntityId(createdUser);

    if (createdUser?.role === 'worker' && userId) {
      await addWorkers(projectId, [userId]);
    }
  }, [addWorkers, projectId]);

  const handleCloseModal = async () => {
    setModalOpen(false);
    await loadTeam();
    await onRefresh?.();
  };

  const handleRemoveMember = useCallback(async (member) => {
    const userId = getEntityId(member);

    if (!userId) {
      return;
    }

    if (member.role === 'worker') {
      await removeWorker(projectId, userId);
    } else {
      const projectIds = Array.isArray(member.projectIds)
        ? member.projectIds.filter((id) => String(id) !== String(projectId))
        : [];

      await updateUser(userId, {
        email: member.email,
        projectIds,
      });
    }

    await loadTeam();
    await onRefresh?.();
  }, [loadTeam, onRefresh, projectId, removeWorker, updateUser]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: 'Role',
        dataIndex: 'role',
        key: 'role',
        render: (role) => <Tag className="pill-tag">{role}</Tag>,
      },
      {
        title: 'Profession',
        dataIndex: 'profession',
        key: 'profession',
        render: (value) => value || '-',
      },
      {
        title: 'Phone',
        key: 'phone',
        render: (_, member) => (
          member.phoneAreaCode && member.phoneNumber
            ? `+${member.phoneAreaCode} ${member.phoneNumber}`
            : '-'
        ),
      },
    ];

    return baseColumns;
  }, []);

  const columnsWithActions = useMemo(() => [
    ...columns,
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'remove',
              label: 'Remove',
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: 'Remove user from project?',
              confirmOkText: 'Remove',
              confirmCancelText: 'Cancel',
              onClick: () => handleRemoveMember(record),
            },
          ]}
        />
      ),
    },
  ], [columns, handleRemoveMember]);

  const toolbarEnd = useMemo(() => (
    <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
      <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
        Add user
      </Button>
    </RoleBasedAccess>
  ), []);

  return (
    <>
      <RoleBasedAccess
        allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}
        fallback={(
          <AdminTable
            dataSource={teamMembers}
            columns={columns}
            rowKey="_id"
            loading={loading}
            toolbarStart={null}
            infiniteScroll={false}
            scroll={false}
          />
        )}
      >
        <AdminTable
          dataSource={teamMembers}
          columns={columnsWithActions}
          rowKey="_id"
          loading={loading}
          toolbarStart={null}
          toolbarEnd={toolbarEnd}
          infiniteScroll={false}
          scroll={false}
        />
      </RoleBasedAccess>

      <AdminModal
        title="Add user"
        saveForm="user-create-form"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={920}
      >
        <UserCreateForm
          defaultProjectIds={[projectId]}
          onCreated={handleUserCreated}
          onClose={handleCloseModal}
        />
      </AdminModal>
    </>
  );
}
