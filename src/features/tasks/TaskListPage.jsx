import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import { CheckOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import AdminModal from '@/src/shared/components/AdminModal';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
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

export default function TaskListPage() {
  const { tasks, loading, fetchAllAccessible, remove, complete, reopen } = useTaskStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);
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
        const userId = typeof task.assigneeUserId === 'object' ? task.assigneeUserId?._id : task.assigneeUserId;
        return task.assigneeUserName || users[userId]?.name || '-';
      },
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
      render: (_, task) => task.notifications?.length || 0,
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
