import { useMemo, useState } from 'react';
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import { Button } from '@/src/ui-kit';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useTaskStore } from '@/src/store/taskStore';
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

export default function ProjectTasksTab({ project, projectId, onRefresh }) {
  const { complete, reopen, remove } = useTaskStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const tasks = project?.tasks || [];
  const userIds = useMemo(
    () => tasks
      .map((task) => (
        typeof task.assigneeUserId === 'object'
          ? task.assigneeUserId?._id
          : task.assigneeUserId
      ))
      .filter(Boolean),
    [tasks],
  );
  const { users } = useUsersInfo(userIds);

  const showModal = (taskToEdit = null) => {
    setEditingTask(taskToEdit);
    setModalOpen(true);
  };

  const closeModal = async () => {
    setEditingTask(null);
    setModalOpen(false);
    await onRefresh?.();
  };

  const columns = [
    {
      title: 'Task',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_, task) => {
        const userId = typeof task.assigneeUserId === 'object'
          ? task.assigneeUserId?._id
          : task.assigneeUserId;
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
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value) => formatAdminDateTime(value),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
          <AdminTableActions
            items={[
              record.status === 'completed'
                ? {
                  key: 'reopen',
                  label: 'Reopen',
                  icon: <ReloadOutlined />,
                  roles: ['superadmin', 'companyAdmin'],
                  onClick: async () => {
                    await reopen(record._id);
                    await onRefresh?.();
                  },
                }
                : {
                  key: 'complete',
                  label: 'Complete',
                  icon: <CheckOutlined />,
                  roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
                  onClick: async () => {
                    await complete(record._id);
                    await onRefresh?.();
                  },
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
                roles: ['superadmin', 'companyAdmin'],
                confirmTitle: 'Delete task?',
                confirmOkText: 'Delete',
                confirmCancelText: 'Cancel',
                onClick: async () => {
                  await remove(record._id);
                  await onRefresh?.();
                },
              },
            ]}
          />
        </RoleBasedAccess>
      ),
    },
  ];

  const toolbarEnd = useMemo(() => (
    <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
      <Button icon={<PlusOutlined />} onClick={() => showModal()}>
        Add task
      </Button>
    </RoleBasedAccess>
  ), []);

  return (
    <>
      <AdminTable
        dataSource={tasks}
        columns={columns}
        rowKey="_id"
        toolbarStart={null}
        toolbarEnd={toolbarEnd}
        infiniteScroll={false}
        scroll={false}
      />

      <AdminModal
        title={editingTask ? 'Edit task' : 'Create task'}
        saveForm="task-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <TaskCreateForm
          defaultProjectId={editingTask ? null : projectId}
          onClose={closeModal}
          taskToEdit={editingTask}
        />
      </AdminModal>
    </>
  );
}
