import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { CheckOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import AdminDrawer from '@/src/shared/components/AdminDrawer';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import AdminTable from '@/src/shared/components/AdminTable';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useTaskStore } from '@/src/store/taskStore';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
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

  const showDrawer = (taskToEdit = null) => {
    setEditingTask(taskToEdit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingTask(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showDrawer(), 'Add task');

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
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      title: 'Notifications',
      key: 'notifications',
      render: (_, task) => task.notifications?.length || 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      ellipsis: false,
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            {record.status === 'completed' ? (
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={() => reopen(record._id)}
              />
            ) : (
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => complete(record._id)}
              />
            )}
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Popconfirm
              title="Delete task?"
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
        dataSource={tasks}
        columns={columns}
        rowKey="_id"
        loading={loading}
      />

      <AdminDrawer
        title={editingTask ? 'Edit task' : 'Create task'}
        saveForm="task-create-form"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <TaskCreateForm onClose={closeDrawer} taskToEdit={editingTask} />
      </AdminDrawer>
    </>
  );
}
