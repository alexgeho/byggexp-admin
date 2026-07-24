import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Avatar, Tag } from 'antd';
import { CheckOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import AdminModal from '@/src/shared/components/AdminModal';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import TaskNotificationsBadge from '@/src/features/tasks/components/TaskNotificationsBadge';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useTaskStore } from '@/src/store/taskStore';
import { matchesEntityId } from '@/src/utils/entityId';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';

const getTaskDisplayStatus = (task) => {
  if (task?.status === 'completed') {
    return { label: 'Completed', color: 'green' };
  }

  const dueTime = task?.dueDate ? new Date(task.dueDate).getTime() : null;
  if (dueTime && !Number.isNaN(dueTime) && dueTime < Date.now()) {
    return { label: 'Overdue', color: 'red' };
  }

  return { label: 'Open', color: 'blue' };
};

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

export default function TaskListPage() {
  const { tasks, loading, fetchAllAccessible, remove, complete, reopen } = useTaskStore();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(() => searchParams.get('projectId') || undefined);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const projectIds = useMemo(
    () => tasks.map((task) => (typeof task.projectId === 'object' ? task.projectId?._id : task.projectId)).filter(Boolean),
    [tasks]
  );
  const { projects } = useProjectsInfo(projectIds);
  const userIds = useMemo(
    () => tasks.map((task) => (typeof task.assigneeUserId === 'object' ? task.assigneeUserId?._id : task.assigneeUserId)).filter(Boolean),
    [tasks]
  );
  const { users } = useUsersInfo(userIds);

  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) {
      return tasks;
    }

    return tasks.filter((task) => {
      const projectId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
      return projectId && matchesEntityId({ _id: projectId }, selectedProjectId);
    });
  }, [tasks, selectedProjectId]);

  const toolbarStart = useMemo(() => (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      />
    </div>
  ), [selectedProjectId]);

  const showModal = (taskToEdit = null) => {
    setEditingTask(taskToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingTask(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showModal(), 'Add task');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

  const columns = [
    {
      title: 'Task',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, task) => {
        const projectId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
        return projectId ? projects[projectId]?.name || '-' : 'Personal';
      },
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_, task) => {
        const assignee = typeof task.assigneeUserId === 'object' ? task.assigneeUserId : null;
        const userId = assignee?._id || task.assigneeUserId;
        const user = assignee || users[userId];
        const displayName = task.assigneeUserName || user?.name || user?.email;

        if (!displayName) {
          return '-';
        }

        const avatarUrl = resolveUrl(user?.avatarUrl);

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
      title: 'Description',
      dataIndex: 'taskDescription',
      key: 'taskDescription',
      render: (value) => value || '-',
    },
    {
      title: 'Start',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (value) => formatAdminDateTime(value),
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value) => formatAdminDateTime(value),
    },
    {
      title: 'Notifications',
      key: 'notifications',
      render: (_, task) => (
        <TaskNotificationsBadge count={task.notifications?.length || 0} />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, task) => {
        const status = getTaskDisplayStatus(task);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            record.status === 'completed'
              ? {
                key: 'reopen',
                label: 'Reopen',
                icon: <ReloadOutlined />,
                roles: ['superadmin', 'companyAdmin'],
                onClick: () => reopen(record._id),
              }
              : {
                key: 'complete',
                label: 'Complete',
                icon: <CheckOutlined />,
                roles: ['superadmin', 'companyAdmin'],
                onClick: () => complete(record._id),
              },
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete task?',
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
        dataSource={filteredTasks}
        columns={columns}
        rowKey="_id"
        loading={loading}
        toolbarStart={toolbarStart}
      />

      <AdminModal
        title={editingTask ? 'Edit task' : 'Create task'}
        saveForm="task-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <TaskCreateForm onClose={closeModal} taskToEdit={editingTask} />
      </AdminModal>
    </>
  );
}
