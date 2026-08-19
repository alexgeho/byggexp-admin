import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DeleteOutlined,
  PlusOutlined,
  UserAddOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Avatar, Form, Tag, message } from 'antd';
import { Button, Field, Select } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { nudgeLogHours } from '@/src/api/hoursReminders';
import { useT } from '@/src/i18n/LanguageProvider';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import LiveStatusCell from '@/src/shared/components/LiveStatusCell';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import { useLiveWorkData } from '@/src/shared/hooks/useLiveWorkData';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

export default function ProjectTeamTab({ projectId, onRefresh }) {
  const t = useT();
  const { removeWorker, addWorkers, addProjectAdmin } = useProjectStore();
  const updateUser = useUserStore((state) => state.update);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  // Live "At work / Off duty" status per member, kept fresh on the shift poll.
  const { workerShiftMap } = useLiveWorkData(Boolean(projectId));
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

    if (!userId) return;
    if (createdUser?.role === 'projectAdmin') {
      await addProjectAdmin(projectId, userId);
    } else if (createdUser?.role === 'worker') {
      await addWorkers(projectId, [userId]);
    }
  }, [addWorkers, addProjectAdmin, projectId]);

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
      if (selectedUser?.role === 'projectAdmin') {
        // Project admins are attached via the dedicated endpoint (editing the
        // user record directly is not permitted for company admins).
        await addProjectAdmin(projectId, userId);
      } else {
        await addWorkers(projectId, [userId]);
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

  const [remindingAll, setRemindingAll] = useState(false);

  // Nudge one or more workers to log today's hours (push + email via backend).
  const handleRemind = useCallback(async (members, { onlyMissing = false } = {}) => {
    const list = Array.isArray(members) ? members : [members];
    const userIds = list.map(getEntityId).filter(Boolean);

    if (!userIds.length) {
      return;
    }

    const hide = message.loading(t('Sending reminder…'), 0);
    try {
      await nudgeLogHours({ userIds, projectId, onlyMissing });
      hide();
      message.success(
        userIds.length > 1
          ? t('Reminder sent to {n} workers').replace('{n}', userIds.length)
          : t('Reminder sent'),
      );
    } catch (error) {
      hide();
      if (error?.response?.status === 404) {
        // Admin UI shipped ahead of the backend endpoint — make that explicit
        // instead of a scary generic error.
        message.info(t('Reminders backend is not deployed yet'));
      } else {
        message.error(formatApiError(error, 'Failed to send reminder'));
      }
    }
  }, [projectId, t]);

  const workerMembers = useMemo(
    () => teamMembers.filter((member) => member.role === 'worker'),
    [teamMembers],
  );

  const handleRemindAll = useCallback(async () => {
    setRemindingAll(true);
    try {
      await handleRemind(workerMembers, { onlyMissing: true });
    } finally {
      setRemindingAll(false);
    }
  }, [handleRemind, workerMembers]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: t('Name'),
        dataIndex: 'name',
        key: 'name',
        render: (text, member) => {
          const avatarUrl = resolveUrl(member.avatarUrl);
          const displayName = text || member.email || t('User');

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
        title: t('Email'),
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: t('Status'),
        key: 'status',
        render: (_, member) => (
          <LiveStatusCell
            user={member}
            workerShiftInfo={workerShiftMap[getEntityId(member)]}
          />
        ),
      },
      {
        title: t('Role'),
        dataIndex: 'role',
        key: 'role',
        render: (role) => <Tag className="pill-tag">{role}</Tag>,
      },
      {
        title: t('Profession'),
        dataIndex: 'profession',
        key: 'profession',
        render: (value) => value || '-',
      },
      {
        title: t('Phone'),
        key: 'phone',
        render: (_, member) => (
          member.phoneAreaCode && member.phoneNumber
            ? `+${member.phoneAreaCode} ${member.phoneNumber}`
            : '-'
        ),
      },
    ];

    return baseColumns;
  }, [workerShiftMap, t]);

  const columnsWithActions = useMemo(() => [
    ...columns,
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            ...(record.role === 'worker'
              ? [{
                key: 'remind',
                label: t('Remind to log hours'),
                icon: <ClockCircleOutlined />,
                onClick: () => handleRemind(record),
              }]
              : []),
            {
              key: 'remove',
              label: t('Remove'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Remove user from project?'),
              confirmOkText: t('Remove'),
              confirmCancelText: t('Cancel'),
              onClick: () => handleRemoveMember(record),
            },
          ]}
        />
      ),
    },
  ], [columns, handleRemoveMember, handleRemind, t]);

  const toolbarEnd = useMemo(() => (
    <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
      <Button
        icon={<ClockCircleOutlined />}
        onClick={handleRemindAll}
        loading={remindingAll}
        disabled={!workerMembers.length}
      >
        {t('Remind hours')}
      </Button>
      <Button icon={<UserAddOutlined />} onClick={openExistingUserModal}>
        {t('Add user')}
      </Button>
      <Button icon={<PlusOutlined />} variant="secondary" onClick={() => setModalOpen(true)}>
        {t('New user')}
      </Button>
    </RoleBasedAccess>
  ), [openExistingUserModal, handleRemindAll, remindingAll, workerMembers.length, t]);

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
        title={t('New user')}
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
        title={t('Add user')}
        saveText={t('Add')}
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
              label={t('User')}
              rules={[{ required: true, message: t('Please select a user') }]}
            >
              <Select
                placeholder={t('Search by name or email')}
                showSearch
                optionFilterProp="label"
                options={availableUsers.map((candidate) => ({
                  value: getEntityId(candidate),
                  label: candidate.name || candidate.email,
                }))}
                notFoundContent={t('No available users')}
                style={{ width: '100%' }}
              />
            </Field>
          </section>
        </Form>
      </AdminModal>
    </>
  );
}
