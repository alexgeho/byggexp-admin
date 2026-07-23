import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { Avatar, Form, Tag, message } from 'antd';
import { Button, Field, Select } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

export default function ProjectTeamTab({ projectId, onRefresh }) {
  const { removeWorker, addWorkers } = useProjectStore();
  const updateUser = useUserStore((state) => state.update);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [existingUserModalOpen, setExistingUserModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [addingExistingUser, setAddingExistingUser] = useState(false);
  const [existingUserForm] = Form.useForm();

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

  const openExistingUserModal = useCallback(async () => {
    existingUserForm.resetFields();
    setExistingUserModalOpen(true);

    try {
      const { data } = isSuperAdmin
        ? await apiClient.get('/users')
        : await apiClient.get('/users/my-company');

      const teamIds = teamMembers.map((member) => getEntityId(member));
      const eligible = (data || []).filter((candidate) => (
        ['worker', 'projectAdmin'].includes(candidate.role) &&
        !teamIds.some((id) => matchesEntityId(candidate, id))
      ));

      setAvailableUsers(eligible);
    } catch (error) {
      message.error(formatApiError(error, 'Failed to load users'));
      setAvailableUsers([]);
    }
  }, [existingUserForm, isSuperAdmin, teamMembers]);

  const handleCloseExistingUserModal = () => {
    setExistingUserModalOpen(false);
    setAvailableUsers([]);
  };

  const handleAddExistingUser = async () => {
    const { userId } = await existingUserForm.validateFields();
    const selectedUser = availableUsers.find((candidate) => matchesEntityId(candidate, userId));

    setAddingExistingUser(true);
    try {
      if (selectedUser?.role === 'worker') {
        await addWorkers(projectId, [userId]);
      } else {
        const projectIds = Array.isArray(selectedUser?.projectIds) ? selectedUser.projectIds : [];
        await updateUser(userId, {
          email: selectedUser?.email,
          projectIds: [...projectIds, projectId],
        });
      }

      handleCloseExistingUserModal();
      await loadTeam();
      await onRefresh?.();
    } catch (error) {
      message.error(formatApiError(error, 'Failed to add user to project'));
    } finally {
      setAddingExistingUser(false);
    }
  };

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
        render: (text, member) => {
          const avatarUrl = resolveUrl(member.avatarUrl);
          const displayName = text || member.email || 'User';

          return (
            <span className="admin-table-user">
              <Avatar size={39} src={avatarUrl} className="admin-table-user__avatar">
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <span className="admin-table-user__name">{displayName}</span>
            </span>
          );
        },
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
      <Button icon={<UserAddOutlined />} onClick={openExistingUserModal}>
        Add user
      </Button>
      <Button icon={<PlusOutlined />} variant="secondary" onClick={() => setModalOpen(true)}>
        New user
      </Button>
    </RoleBasedAccess>
  ), [openExistingUserModal]);

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
        title="New user"
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

      <AdminModal
        title="Add user"
        saveText="Add"
        open={existingUserModalOpen}
        onCancel={handleCloseExistingUserModal}
        onSave={handleAddExistingUser}
        saveLoading={addingExistingUser}
        destroyOnHidden
        width={480}
      >
        <Form id="add-existing-user-form" className="admin-modal-form" form={existingUserForm} layout="vertical">
          <section className="admin-modal-form__section">
            <Field
              name="userId"
              label="User"
              rules={[{ required: true, message: 'Please select a user' }]}
            >
              <Select
                placeholder="Search by name or email"
                showSearch
                optionFilterProp="label"
                options={availableUsers.map((candidate) => ({
                  value: getEntityId(candidate),
                  label: candidate.name || candidate.email,
                }))}
                notFoundContent="No available users"
                style={{ width: '100%' }}
              />
            </Field>
          </section>
        </Form>
      </AdminModal>
    </>
  );
}
